from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import BigInteger, String, Float, JSON, TIMESTAMP, text
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Quote(Base):
    """Quote record for arbitrage opportunities."""
    __tablename__ = "quotes"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chain: Mapped[str] = mapped_column(String)
    amount_in_usd: Mapped[float] = mapped_column(Float)
    amount_out_usd: Mapped[float] = mapped_column(Float)
    gas_estimate_usd: Mapped[float] = mapped_column(Float)
    flash_fee_usd: Mapped[float] = mapped_column(Float)
    profit_usd: Mapped[float] = mapped_column(Float)
    legs: Mapped[dict] = mapped_column(JSON)
    ts: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

class Transaction(Base):
    """Transaction execution record."""
    __tablename__ = "transactions"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chain: Mapped[str] = mapped_column(String)
    tx_hash: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String)  # pending, success, failed
    gas_used: Mapped[int] = mapped_column(BigInteger)
    gas_price: Mapped[int] = mapped_column(BigInteger)
    profit_usd: Mapped[float] = mapped_column(Float)
    legs: Mapped[dict] = mapped_column(JSON)
    ts: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))

class Pool(Base):
    """Pool information cache."""
    __tablename__ = "pools"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chain: Mapped[str] = mapped_column(String)
    dex: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    token0: Mapped[str] = mapped_column(String)
    token1: Mapped[str] = mapped_column(String)
    tvl_usd: Mapped[float] = mapped_column(Float)
    fee_tier: Mapped[int] = mapped_column(BigInteger)
    last_updated: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"))
