import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import List, Dict, Any
from .models import Base, Quote, Transaction, Pool

class DatabaseWriter:
    """Async database writer for arbitrage data."""
    
    def __init__(self, database_url: str):
        self.engine = create_async_engine(database_url)
        self.async_session = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
    
    async def create_tables(self):
        """Create all database tables."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def write_quote(self, quote_data: Dict[str, Any]):
        """Write a quote record."""
        async with self.async_session() as session:
            quote = Quote(**quote_data)
            session.add(quote)
            await session.commit()
    
    async def write_transaction(self, tx_data: Dict[str, Any]):
        """Write a transaction record."""
        async with self.async_session() as session:
            tx = Transaction(**tx_data)
            session.add(tx)
            await session.commit()
    
    async def write_pools(self, pools_data: List[Dict[str, Any]]):
        """Write multiple pool records."""
        async with self.async_session() as session:
            pools = [Pool(**pool_data) for pool_data in pools_data]
            session.add_all(pools)
            await session.commit()
    
    async def update_pool_tvl(self, pool_address: str, chain: str, tvl_usd: float):
        """Update pool TVL."""
        async with self.async_session() as session:
            pool = await session.get(Pool, {"address": pool_address, "chain": chain})
            if pool:
                pool.tvl_usd = tvl_usd
                await session.commit()
    
    async def close(self):
        """Close database connection."""
        await self.engine.dispose()
