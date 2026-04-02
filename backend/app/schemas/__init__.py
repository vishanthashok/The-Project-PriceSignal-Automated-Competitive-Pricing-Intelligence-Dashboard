from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    slack_webhook_url: Optional[str] = None
    alert_threshold_pct: float
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    slack_webhook_url: Optional[str] = None
    alert_threshold_pct: Optional[float] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class CompetitorCreate(BaseModel):
    name: str
    url: str
    css_selector: str = ".price"


class CompetitorOut(BaseModel):
    id: int
    name: str
    url: str
    css_selector: str
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    my_price: Optional[float] = None
    target_margin: float = 10.0
    interval: str = "daily"
    competitors: List[CompetitorCreate] = []


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    my_price: Optional[float]
    target_margin: float
    interval: str
    is_active: bool
    created_at: datetime
    competitors: List[CompetitorOut] = []

    class Config:
        from_attributes = True


class PriceSnapshotOut(BaseModel):
    id: int
    product_id: int
    competitor_id: Optional[int]
    price: float
    scraped_at: datetime
    source_url: Optional[str]
    success: bool

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    product_id: int
    competitor_name: str
    competitor_price: float
    my_price: float
    recommended_price: Optional[float]
    delta_pct: float
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PriceRecommendation(BaseModel):
    product_id: int
    current_price: Optional[float]
    recommended_price: float
    elasticity: float
    confidence: str
    rationale: str
    data_points: int
