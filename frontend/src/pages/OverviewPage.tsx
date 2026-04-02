import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getSnapshots, triggerScrape } from '../api/client';
import { Product, PriceSnapshot } from '../types';
import { useNavigate } from 'react-router-dom';

function ProductCard({ product }: { product: Product }) {
  const qc = useQueryClient();
  const { data: snapshots } = useQuery<PriceSnapshot[]>({
    queryKey: ['snapshots', product.id, 'recent'],
    queryFn: () => getSnapshots(product.id, { limit: 2 }).then(r => r.data),
  });

  const scrape = useMutation({
    mutationFn: () => triggerScrape(product.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots', product.id] }),
  });

  const latest = snapshots?.[0];
  const prev = snapshots?.[1];
  const delta = latest && prev ? ((latest.price - prev.price) / prev.price) * 100 : null;
  const myPrice = product.my_price;
  const isUndercut = latest && myPrice && latest.price < myPrice;

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isUndercut ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{product.name}</p>
          {product.category && (
            <span style={{
              fontSize: 11, color: 'var(--text-muted)',
              background: 'var(--surface2)', borderRadius: 6, padding: '2px 8px',
              display: 'inline-block', marginTop: 6,
            }}>{product.category}</span>
          )}
        </div>
        {isUndercut && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#fca5a5',
            background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '3px 8px',
          }}>UNDERCUT</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>My price</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            {myPrice ? `$${myPrice.toFixed(2)}` : '—'}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Competitor</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
            color: isUndercut ? '#fca5a5' : 'var(--text)' }}>
            {latest ? `$${latest.price.toFixed(2)}` : '—'}
          </p>
        </div>
        {delta !== null && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>24h Δ</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 600,
              color: delta < 0 ? 'var(--red)' : 'var(--green)' }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
        }}>
          {product.competitors.length} competitor{product.competitors.length !== 1 ? 's' : ''}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
        }}>
          {product.interval}
        </span>
        <button
          onClick={() => scrape.mutate()}
          disabled={scrape.isPending}
          style={{
            marginLeft: 'auto', fontSize: 11, color: 'var(--green)',
            border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6,
            padding: '3px 10px', background: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {scrape.isPending ? 'Scraping...' : '↺ Scrape now'}
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>Overview</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {products?.length ?? 0} products tracked
          </p>
        </div>
        <button onClick={() => navigate('/add-product')} style={btnStyle}>
          + Add product
        </button>
      </div>

      {products?.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {products?.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div style={{
      textAlign: 'center', padding: '80px 0',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>◎</div>
      <p style={{ fontSize: 16, margin: '0 0 8px', color: 'var(--text)' }}>No products yet</p>
      <p style={{ fontSize: 14, margin: '0 0 24px' }}>Add your first product to start tracking competitor prices.</p>
      <button onClick={() => navigate('/add-product')} style={btnStyle}>+ Add product</button>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: 'var(--surface)', borderRadius: 14, padding: 20,
          height: 180, animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: 'var(--green)', color: '#0d0f0e',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
