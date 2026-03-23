import asyncpg
from typing import Optional
from app.services.encryption import get_encryption_service


class ConnectionManager:

    
    @staticmethod
    async def test_connection(
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: str = "prefer"
    ) -> tuple[bool, Optional[str]]:

        try:

            dsn = f"postgresql://{username}:{password}@{host}:{port}/{database}"
            

            conn = await asyncpg.connect(dsn, timeout=10)
            

            await conn.execute("SELECT 1")
            await conn.close()
            
            return True, None
            
        except asyncpg.InvalidPasswordError:
            return False, "Invalid username or password"
        except asyncpg.InvalidCatalogNameError:
            return False, f"Database '{database}' does not exist"
        except OSError as e:
            return False, f"Connection failed: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"
    
    @staticmethod
    async def get_schema_info(
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
    ) -> dict:

        dsn = f"postgresql://{username}:{password}@{host}:{port}/{database}"
        conn = await asyncpg.connect(dsn, timeout=10)
        
        try:

            tables = await conn.fetch("""
                SELECT table_name, table_schema
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                AND table_type = 'BASE TABLE'
                ORDER BY table_schema, table_name
            """)
            
            schema_info = {"tables": []}
            
            for table in tables:
                table_name = table["table_name"]
                schema_name = table["table_schema"]
                

                columns_data = await conn.fetch("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = $1 AND table_schema = $2
                    ORDER BY ordinal_position
                """, table_name, schema_name)
                
                table_columns = []
                for col in columns_data:
                    col_name = col["column_name"]
                    data_type = col["data_type"]
                    
                    sample_values = []

                    if any(t in data_type.lower() for t in ["char", "text", "varchar"]):
                        try:

                            samples = await conn.fetch(f"""
                                SELECT DISTINCT "{col_name}"
                                FROM "{schema_name}"."{table_name}"
                                WHERE "{col_name}" IS NOT NULL
                                LIMIT 5
                            """)
                            sample_values = [str(r[0]) for r in samples]
                        except:

                            sample_values = []
                    
                    table_columns.append({
                        "name": col_name,
                        "type": data_type,
                        "nullable": col["is_nullable"] == "YES",
                        "default": col["column_default"],
                        "sample_values": sample_values
                    })

                schema_info["tables"].append({
                    "name": table_name,
                    "schema": schema_name,
                    "full_name": f"{schema_name}.{table_name}",
                    "columns": table_columns
                })
            
            return schema_info
            
        finally:
            await conn.close()
    
    @staticmethod
    async def execute_query(
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        query: str,
        params: list = None
    ) -> dict:

        dsn = f"postgresql://{username}:{password}@{host}:{port}/{database}"
        conn = await asyncpg.connect(dsn, timeout=30)
        
        try:

            async with conn.transaction():

                await conn.execute("SET TRANSACTION READ ONLY")
                

                rows = await conn.fetch(query, *(params or []))
                
                if not rows:
                    return {"columns": [], "rows": [], "row_count": 0}
                

                columns = list(rows[0].keys())
                

                data = [dict(row) for row in rows]
                
                return {
                    "columns": columns,
                    "rows": data,
                    "row_count": len(data)
                }
                
        finally:
            await conn.close()
