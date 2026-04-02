import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List, Optional, Tuple


def compute_elasticity(prices: List[float], demand_proxy: List[float]) -> Tuple[float, float]:
    """
    Compute price elasticity of demand using log-log OLS regression.
    Returns (elasticity_coefficient, r_squared).
    """
    if len(prices) < 5:
        raise ValueError("Need at least 5 data points to estimate elasticity.")

    prices_arr = np.array(prices, dtype=float)
    demand_arr = np.array(demand_proxy, dtype=float)

    if np.any(prices_arr <= 0) or np.any(demand_arr <= 0):
        raise ValueError("Prices and demand must be strictly positive.")

    log_p = np.log(prices_arr).reshape(-1, 1)
    log_d = np.log(demand_arr)

    model = LinearRegression().fit(log_p, log_d)
    r_squared = model.score(log_p, log_d)

    return float(model.coef_[0]), float(r_squared)


def recommend_price(
    elasticity: float,
    cost: float,
    current_price: float,
    margin_floor_pct: float = 10.0,
) -> float:
    """
    Revenue-maximizing price under constant elasticity demand.
    P* = (e / (e + 1)) * MC  [Lerner markup formula]
    Enforces a minimum margin floor.
    """
    if elasticity >= -1:
        # Inelastic demand — raise price to the margin-floor-enforced max
        return current_price * 1.05

    optimal = (elasticity / (elasticity + 1)) * cost
    min_price = cost * (1 + margin_floor_pct / 100)
    return max(optimal, min_price)


def get_confidence_label(r_squared: float, n_points: int) -> str:
    if n_points < 10 or r_squared < 0.3:
        return "low"
    if n_points < 30 or r_squared < 0.6:
        return "medium"
    return "high"


def build_demand_proxy_from_snapshots(prices: List[float]) -> List[float]:
    """
    Simple heuristic: invert price rank as demand proxy when no sales data is available.
    Lower price → higher rank → higher demand proxy.
    """
    if not prices:
        return []
    min_p = min(prices)
    max_p = max(prices)
    span = max_p - min_p or 1.0
    # Normalise to [1, 10] inverted scale
    return [10 - 9 * ((p - min_p) / span) + 1 for p in prices]
