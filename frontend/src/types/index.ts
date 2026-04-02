export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  slack_webhook_url: string | null;
  alert_threshold_pct: number;
  created_at: string;
}

export interface Competitor {
  id: number;
  name: string;
  url: string;
  css_selector: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  my_price: number | null;
  target_margin: number;
  interval: 'hourly' | 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
  competitors: Competitor[];
}

export interface PriceSnapshot {
  id: number;
  product_id: number;
  competitor_id: number | null;
  price: number;
  scraped_at: string;
  source_url: string | null;
  success: boolean;
}

export interface Alert {
  id: number;
  product_id: number;
  competitor_name: string;
  competitor_price: number;
  my_price: number;
  recommended_price: number | null;
  delta_pct: number;
  is_read: boolean;
  created_at: string;
}

export interface PriceRecommendation {
  product_id: number;
  current_price: number | null;
  recommended_price: number;
  elasticity: number;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
  data_points: number;
}
