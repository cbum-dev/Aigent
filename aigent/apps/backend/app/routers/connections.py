from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession, CurrentUser, AdminUser
from app.models.database_connection import DatabaseConnection
from app.schemas.database_connection import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    DatabaseConnectionResponse,
    DatabaseConnectionTestRequest,
    DatabaseConnectionTestResponse,
    SchemaInfoResponse
)
from app.services.encryption import get_encryption_service
from app.services.connection_manager import ConnectionManager
from app.services import cache

router = APIRouter(prefix="/connections", tags=["connections"])
encryption = get_encryption_service()


def mask_string(s: str, show_chars: int = 4) -> str:
    """Mask a string showing only first few characters."""
    if len(s) <= show_chars:
        return "*" * len(s)
    return s[:show_chars] + "*" * (len(s) - show_chars)


@router.post("", response_model=DatabaseConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    data: DatabaseConnectionCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """Create a new database connection."""
    connection = DatabaseConnection(
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        host_encrypted=encryption.encrypt(data.host),
        port=data.port,
        database_encrypted=encryption.encrypt(data.database),
        username_encrypted=encryption.encrypt(data.username),
        password_encrypted=encryption.encrypt(data.password),
        ssl_mode=data.ssl_mode
    )
    
    db.add(connection)
    await db.flush()

    # Invalidate list cache
    await cache.delete(f"connections:{current_user.company_id}")
    
    # Return with masked values
    return DatabaseConnectionResponse(
        id=connection.id,
        company_id=connection.company_id,
        name=connection.name,
        description=connection.description,
        host=mask_string(data.host),
        port=connection.port,
        database=mask_string(data.database),
        ssl_mode=connection.ssl_mode,
        is_active=connection.is_active,
        last_tested_at=connection.last_tested_at,
        last_test_success=connection.last_test_success,
        created_at=connection.created_at
    )


@router.get("", response_model=list[DatabaseConnectionResponse])
async def list_connections(current_user: CurrentUser, db: DbSession):
    """List all database connections for the current company."""
    cache_key = f"connections:{current_user.company_id}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.company_id == current_user.company_id
        )
    )
    connections = result.scalars().all()
    
    # Return with masked values
    items = [
        DatabaseConnectionResponse(
            id=conn.id,
            company_id=conn.company_id,
            name=conn.name,
            description=conn.description,
            host=mask_string(encryption.decrypt(conn.host_encrypted)),
            port=conn.port,
            database=mask_string(encryption.decrypt(conn.database_encrypted)),
            ssl_mode=conn.ssl_mode,
            is_active=conn.is_active,
            last_tested_at=conn.last_tested_at,
            last_test_success=conn.last_test_success,
            created_at=conn.created_at
        )
        for conn in connections
    ]
    await cache.set_json(cache_key, [item.model_dump() for item in items], ttl=300)
    return items


@router.get("/{connection_id}", response_model=DatabaseConnectionResponse)
async def get_connection(
    connection_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get a specific database connection."""
    cache_key = f"connection:{connection_id}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == UUID(connection_id),
            DatabaseConnection.company_id == current_user.company_id
        )
    )
    conn = result.scalar_one_or_none()
    
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    item = DatabaseConnectionResponse(
        id=conn.id,
        company_id=conn.company_id,
        name=conn.name,
        description=conn.description,
        host=mask_string(encryption.decrypt(conn.host_encrypted)),
        port=conn.port,
        database=mask_string(encryption.decrypt(conn.database_encrypted)),
        ssl_mode=conn.ssl_mode,
        is_active=conn.is_active,
        last_tested_at=conn.last_tested_at,
        last_test_success=conn.last_test_success,
        created_at=conn.created_at
    )
    await cache.set_json(cache_key, item.model_dump(), ttl=300)
    return item


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: str,
    admin_user: AdminUser,
    db: DbSession
):
    """Delete a database connection (admin only)."""
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == UUID(connection_id),
            DatabaseConnection.company_id == admin_user.company_id
        )
    )
    conn = result.scalar_one_or_none()
    
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )

    # Invalidate caches
    await cache.delete(f"connection:{connection_id}")
    await cache.delete(f"connections:{admin_user.company_id}")
    await cache.delete(f"conn_creds:{connection_id}")
    
    await db.delete(conn)


@router.post("/test", response_model=DatabaseConnectionTestResponse)
async def test_connection_credentials(data: DatabaseConnectionTestRequest):
    """Test database connection with provided credentials."""
    success, error = await ConnectionManager.test_connection(
        host=data.host,
        port=data.port,
        database=data.database,
        username=data.username,
        password=data.password,
        ssl_mode=data.ssl_mode
    )
    
    return DatabaseConnectionTestResponse(
        success=success,
        message=error if not success else "Connection successful"
    )


@router.post("/{connection_id}/test", response_model=DatabaseConnectionTestResponse)
async def test_saved_connection(
    connection_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Test a saved database connection."""
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == UUID(connection_id),
            DatabaseConnection.company_id == current_user.company_id
        )
    )
    conn = result.scalar_one_or_none()
    
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Decrypt credentials
    host = encryption.decrypt(conn.host_encrypted)
    database = encryption.decrypt(conn.database_encrypted)
    username = encryption.decrypt(conn.username_encrypted)
    password = encryption.decrypt(conn.password_encrypted)
    
    success, error = await ConnectionManager.test_connection(
        host=host,
        port=conn.port,
        database=database,
        username=username,
        password=password,
        ssl_mode=conn.ssl_mode
    )
    
    # Update connection status
    conn.last_tested_at = datetime.now(timezone.utc)
    conn.last_test_success = success
    await db.flush()
    
    return DatabaseConnectionTestResponse(
        success=success,
        message=error if not success else "Connection successful"
    )


@router.get("/{connection_id}/schema", response_model=SchemaInfoResponse)
async def get_connection_schema(
    connection_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get schema information from a database connection."""
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == UUID(connection_id),
            DatabaseConnection.company_id == current_user.company_id
        )
    )
    conn = result.scalar_one_or_none()
    
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Decrypt credentials
    host = encryption.decrypt(conn.host_encrypted)
    database = encryption.decrypt(conn.database_encrypted)
    username = encryption.decrypt(conn.username_encrypted)
    password = encryption.decrypt(conn.password_encrypted)
    
    try:
        schema_info = await ConnectionManager.get_schema_info(
            host=host,
            port=conn.port,
            database=database,
            username=username,
            password=password
        )
        return SchemaInfoResponse(**schema_info)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch schema: {str(e)}"
        )
