import pytest
from app.pricing.engine import (
    compute_elasticity,
    recommend_price,
    build_demand_proxy_from_snapshots,
    get_confidence_label,
)


def test_compute_elasticity_basic():
    prices = [10, 12, 14, 16, 18, 20]
    demand = [100, 85, 72, 61, 52, 44]
    elasticity, r2 = compute_elasticity(prices, demand)
    assert elasticity < 0, "Elasticity should be negative (higher price → lower demand)"
    assert 0 <= r2 <= 1


def test_compute_elasticity_insufficient_data():
    with pytest.raises(ValueError, match="at least 5"):
        compute_elasticity([10, 20, 30], [100, 80, 60])


def test_compute_elasticity_zero_price_raises():
    with pytest.raises(ValueError, match="strictly positive"):
        compute_elasticity([0, 10, 15, 20, 25], [100, 80, 60, 40, 20])


def test_compute_elasticity_zero_demand_raises():
    with pytest.raises(ValueError, match="strictly positive"):
        compute_elasticity([10, 15, 20, 25, 30], [100, 80, 0, 40, 20])


def test_recommend_price_elastic():
    # Elastic demand (e < -1): should compute optimal price
    cost = 50.0
    current = 100.0
    rec = recommend_price(elasticity=-2.0, cost=cost, current_price=current, margin_floor_pct=10.0)
    assert rec >= cost * 1.10, "Must respect margin floor"


def test_recommend_price_inelastic():
    # Inelastic demand (e > -1): should nudge price up
    rec = recommend_price(elasticity=-0.5, cost=50.0, current_price=100.0)
    assert rec > 100.0, "Inelastic demand should push price higher"


def test_recommend_price_margin_floor():
    # Even with elastic demand, margin floor must be respected
    rec = recommend_price(elasticity=-5.0, cost=100.0, current_price=200.0, margin_floor_pct=20.0)
    assert rec >= 120.0, "Should enforce 20% margin floor"


def test_build_demand_proxy_empty():
    assert build_demand_proxy_from_snapshots([]) == []


def test_build_demand_proxy_range():
    prices = [10.0, 20.0, 30.0]
    proxy = build_demand_proxy_from_snapshots(prices)
    assert len(proxy) == 3
    assert proxy[0] > proxy[-1], "Lower price should have higher demand proxy"
    assert all(p >= 1 for p in proxy)


def test_build_demand_proxy_single_price():
    # All same price — should not divide by zero
    prices = [15.0, 15.0, 15.0, 15.0, 15.0]
    proxy = build_demand_proxy_from_snapshots(prices)
    assert len(proxy) == 5
    assert all(isinstance(p, float) for p in proxy)


def test_confidence_label_low():
    assert get_confidence_label(0.2, 8) == "low"


def test_confidence_label_medium():
    assert get_confidence_label(0.5, 15) == "medium"


def test_confidence_label_high():
    assert get_confidence_label(0.8, 50) == "high"


def test_elasticity_with_large_dataset():
    import numpy as np
    prices = list(np.linspace(5, 50, 30))
    demand = [1000 / p ** 1.5 for p in prices]
    elasticity, r2 = compute_elasticity(prices, demand)
    assert elasticity < -1, "Should detect elastic demand in power-law data"
    assert r2 > 0.9, "Should have high R² for clean power-law data"
