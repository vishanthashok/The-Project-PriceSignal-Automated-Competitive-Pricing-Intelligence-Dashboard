from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ScrapeInterval(str, enum.Enum):
    hourly = "hourly"
    daily = "daily"
    weekly = "weekly"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    my_price = Column(Float, nullable=True)
    target_margin = Column(Float, default=10.0)
    interval = Column(String, default=ScrapeInterval.daily)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="products")
    competitors = relationship("Competitor", back_populates="product", cascade="all, delete-orphan")
    snapshots = relationship("PriceSnapshot", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")


class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    css_selector = Column(String, nullable=False, default=".price")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="competitors")
    snapshots = relationship("PriceSnapshot", back_populates="competitor", cascade="all, delete-orphan")


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=True)
    price = Column(Float, nullable=False)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    source_url = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)

    product = relationship("Product", back_populates="snapshots")
    competitor = relationship("Competitor", back_populates="snapshots")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    competitor_name = Column(String, nullable=False)
    competitor_price = Column(Float, nullable=False)
    my_price = Column(Float, nullable=False)
    recommended_price = Column(Float, nullable=True)
    delta_pct = Column(Float, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
    product = relationship("Product", back_populates="alerts")
