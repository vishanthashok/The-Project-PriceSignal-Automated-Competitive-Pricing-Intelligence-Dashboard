import { useQuery } from '@tanstack/react-query';
import { getProducts, getRecommendation } from '../api/client';
import { Product, PriceRecommendation } from '../types';

function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const colors = {
    low:    { bg: 'rgba(239,68,68,0.12)',  text: '#fca5a5',  border: 'rgba(239,68,68,0.3)'  },
    medium: { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d',  border: 'rgba(245,158,11,0.3)' },
    high:   { bg: 'rgba(34,197,94,0.12)',  text: '#86efac',  border: 'rgba(34,197,94,0.3)'  },
  }[level];

  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>{level} confidence</span>
  );
}

function RecommendationCard({ product }: { product: Product }) {
  const { data: rec, isLoading } = useQuery<PriceRecommendation>({
    queryKey: ['recommendation', product.id],
    queryFn: () => getRecommendation(product.id).then(r => r.data),
  });

  const priceDelta = rec && product.my_price
    ? rec.recommended_price - product.my_price
    : null;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{product.name}</p>
          {product.category && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{product.category}</p>
          )}
        </div>
        {rec && <ConfidenceBadge level={rec.confidence} />}
      </div>

      {isLoading ? (
        <div style={{ height: 80, background: 'var(--surface2)', borderRadius: 10, opacity: 0.5 }} />
      ) : rec ? (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current price</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                {product.my_price ? `$${product.my_price.toFixed(2)}` : '—'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 20 }}>→</div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Recommended</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
                ${rec.recommended_price.toFixed(2)}
              </p>
            </div>
            {priceDelta !== null && (
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Change</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 600,
                  color: priceDelta < 0 ? 'var(--red)' : 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {priceDelta > 0 ? '+' : ''}${priceDelta.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div style={{
            background: 'var(--surface2)', borderRadius: 10, padding: 14,
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
          }}>
            {rec.rationale}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <Stat label="Elasticity" value={rec.elasticity.toFixed(3)} />
            <Stat label="Data points" value={String(rec.data_points)} />
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load recommendation.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 8, padding: '8px 14px',
      display: 'flex', gap: 10, alignItems: 'center',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
    </div>
  );
}

export default function RecommendationsPage() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data),
  });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>Recommendations</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Revenue-maximizing prices based on elasticity modelling
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : products?.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No products tracked yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {products?.map(p => <RecommendationCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
