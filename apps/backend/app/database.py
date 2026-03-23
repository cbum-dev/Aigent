from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings
import ssl as ssl_module

settings = get_settings()


_connect_args = {}
_db_url = settings.database_url
if any(host in _db_url for host in ["neon.tech", "amazonaws.com", "render.com", "supabase"]) or \
   ("asyncpg" in _db_url and "localhost" not in _db_url and "127.0.0.1" not in _db_url):

    ssl_context = ssl_module.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl_module.CERT_NONE
    _connect_args["ssl"] = ssl_context


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    connect_args=_connect_args,
)


async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):

    pass


async def get_db() -> AsyncSession:

    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
