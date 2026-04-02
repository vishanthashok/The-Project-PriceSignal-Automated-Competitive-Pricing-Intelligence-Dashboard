import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { getProducts, getSnapshots } from '../api/client';
import { Product, PriceSnapshot } from '../types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7'];
const RANGES = [{ label: '7d', days: 7 }, { label: '14d', days: 14 }, { label: '30d', days: 30 }];

export default function TrendsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [range, setRange] = useState(7);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => getProducts().then(r => r.data),
    onSuccess: (data) => { if (data.length > 0 && !selectedId) setSelectedId(data[0].id); },
  } as any);

  const fromDate = subDays(new Date(), range).toISOString();

  const { data: snapshots, isLoading } = useQuery<PriceSnapshot[]>({
    queryKey: ['snapshots', selectedId, range],
    queryFn: () => getSnapshots(selectedId!, { from_date: fromDate }).then(r => r.data),
    enabled: !!selectedId,
  });

  const product = products?.find(p => p.id === selectedId);

  // Group snapshots by competitor then build chart data
  const chartData = buildChartData(snapshots ?? [], product?.competitors ?? []);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>Trends</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Price history over time
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={selectedId ?? ''}
          onChange={e => setSelectedId(Number(e.target.value))}
          style={selectStyle}
        >
          {!products?.length && <option>No products yet</option>}
          {products?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              style={{
                padding: '8px 16px', border: 'none', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: range === r.days ? 'var(--green)' : 'var(--surface)',
                color: range === r.days ? '#0d0f0e' : 'var(--text-muted)',
              }}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '24px 8px 16px',
      }}>
        {isLoading || !snapshots ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : snapshots.length === 0 ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No data yet — trigger a scrape from the Overview tab.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${v}`}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, fontSize: 13,
                }}
                labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16, color: 'var(--text-muted)' }}
              />
              {product?.my_price && (
                <Line
                  type="monotone" dataKey="my_price" name="My price"
                  stroke="#ffffff" strokeWidth={1.5} strokeDasharray="4 4"
                  dot={false}
                />
              )}
              {(product?.competitors ?? []).map((comp, i) => (
                <Line
                  key={comp.id}
                  type="monotone"
                  dataKey={`comp_${comp.id}`}
                  name={comp.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats row */}
      {snapshots && snapshots.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Data points', value: snapshots.length },
            { label: 'Lowest seen', value: `$${Math.min(...snapshots.map(s => s.price)).toFixed(2)}` },
            { label: 'Highest seen', value: `$${Math.max(...snapshots.map(s => s.price)).toFixed(2)}` },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 16,
            }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildChartData(snapshots: PriceSnapshot[], competitors: { id: number }[]) {
  const byTime: Record<string, Record<string, number>> = {};

  for (const snap of snapshots) {
    const time = format(new Date(snap.scraped_at), 'MMM d HH:mm');
    if (!byTime[time]) byTime[time] = {};
    if (snap.competitor_id) {
      byTime[time][`comp_${snap.competitor_id}`] = snap.price;
    }
  }

  return Object.entries(byTime)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, vals]) => ({ time, ...vals }));
}

const selectStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', fontFamily: 'inherit', fontSize: 14,
  minWidth: 180, cursor: 'pointer',
};
