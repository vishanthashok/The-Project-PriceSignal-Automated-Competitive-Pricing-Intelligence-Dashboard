import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../api/client';

interface CompetitorInput {
  name: string;
  url: string;
  css_selector: string;
}

export default function AddProductPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [myPrice, setMyPrice] = useState('');
  const [margin, setMargin] = useState('10');
  const [interval, setInterval] = useState('daily');
  const [competitors, setCompetitors] = useState<CompetitorInput[]>([
    { name: '', url: '', css_selector: '.price' },
  ]);
  const [error, setError] = useState('');

  const addComp = () => setCompetitors(c => [...c, { name: '', url: '', css_selector: '.price' }]);
  const removeComp = (i: number) => setCompetitors(c => c.filter((_, idx) => idx !== i));
  const updateComp = (i: number, field: keyof CompetitorInput, value: string) => {
    setCompetitors(c => c.map((comp, idx) => idx === i ? { ...comp, [field]: value } : comp));
  };

  const mutation = useMutation({
    mutationFn: () => createProduct({
      name,
      category: category || undefined,
      my_price: myPrice ? parseFloat(myPrice) : undefined,
      target_margin: parseFloat(margin),
      interval,
      competitors: competitors.filter(c => c.name && c.url),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/overview');
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Failed to create product.'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Product name is required.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>Add product</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Define a product and the competitors to track.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Product details */}
        <Section title="Product details">
          <Field label="Product name *">
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Wireless Headphones Pro" required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category">
              <input style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}
                placeholder="e.g. electronics" />
            </Field>
            <Field label="My current price ($)">
              <input style={inputStyle} type="number" step="0.01" min="0"
                value={myPrice} onChange={e => setMyPrice(e.target.value)} placeholder="99.99" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Target margin (%)">
              <input style={inputStyle} type="number" step="1" min="0" max="100"
                value={margin} onChange={e => setMargin(e.target.value)} />
            </Field>
            <Field label="Scrape interval">
              <select style={inputStyle} value={interval} onChange={e => setInterval(e.target.value)}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Competitors */}
        <Section title="Competitors">
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            Add competitor URLs and the CSS selector for the price element.
            Use browser DevTools → Inspect to find the right selector (e.g. <code>.a-price-whole</code>).
          </p>
          {competitors.map((comp, i) => (
            <div key={i} style={{
              background: 'var(--surface2)', borderRadius: 12, padding: 16,
              marginBottom: 10, position: 'relative',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Field label="Name">
                  <input style={inputStyle} value={comp.name}
                    onChange={e => updateComp(i, 'name', e.target.value)}
                    placeholder="e.g. Amazon" />
                </Field>
                <Field label="CSS selector">
                  <input style={inputStyle} value={comp.css_selector}
                    onChange={e => updateComp(i, 'css_selector', e.target.value)}
                    placeholder=".price" />
                </Field>
              </div>
              <Field label="URL">
                <input style={inputStyle} value={comp.url}
                  onChange={e => updateComp(i, 'url', e.target.value)}
                  placeholder="https://amazon.com/dp/..." />
              </Field>
              {competitors.length > 1 && (
                <button type="button" onClick={() => removeComp(i)}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 16, padding: '2px 6px',
                    fontFamily: 'inherit',
                  }}>×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addComp} style={ghostBtn}>
            + Add competitor
          </button>
        </Section>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={mutation.isPending} style={submitBtn}>
            {mutation.isPending ? 'Creating...' : 'Create product'}
          </button>
          <button type="button" onClick={() => navigate('/overview')} style={ghostBtn}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24,
    }}>
      <p style={{ margin: '0 0 20px', fontWeight: 600, fontSize: 15 }}>{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
  fontSize: 14, outline: 'none', width: '100%',
};

const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'none', color: 'var(--text-muted)', fontFamily: 'inherit',
  fontSize: 14, cursor: 'pointer',
};

const submitBtn: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 10, border: 'none',
  background: 'var(--green)', color: '#0d0f0e',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
