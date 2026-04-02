import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { getAlerts, markAlertRead, markAllRead } from '../api/client';
import { Alert } from '../types';

export default function AlertsPage() {
  const qc = useQueryClient();

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => getAlerts().then(r => r.data),
  });

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts', 'unread'] });
    },
  });

  const markOne = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts', 'unread'] });
    },
  });

  const unreadCount = alerts?.filter(a => !a.is_read).length ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>
            Alerts
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 14, fontWeight: 600,
                background: 'var(--red)', color: '#fff',
                borderRadius: 10, padding: '2px 8px', verticalAlign: 'middle',
              }}>{unreadCount}</span>
            )}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Competitor undercut notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            style={ghostBtn}
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : alerts?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>◉</div>
          <p style={{ fontSize: 15, margin: 0, color: 'var(--text)' }}>No alerts yet</p>
          <p style={{ fontSize: 13, margin: '6px 0 0' }}>You'll be notified when a competitor undercuts your price.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts?.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onRead={() => !alert.is_read && markOne.mutate(alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onRead }: { alert: Alert; onRead: () => void }) {
  const delta = alert.delta_pct.toFixed(1);

  return (
    <div
      onClick={onRead}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${alert.is_read ? 'var(--border)' : 'rgba(239,68,68,0.35)'}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 20,
        cursor: alert.is_read ? 'default' : 'pointer',
        opacity: alert.is_read ? 0.65 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: alert.is_read ? 'var(--border)' : 'var(--red)',
      }} />

      {/* Main */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{alert.competitor_name}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#fca5a5',
            background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '2px 6px',
          }}>
            −{delta}% cheaper
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Their price: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>${alert.competitor_price.toFixed(2)}</span>
          {' · '}
          Your price: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>${alert.my_price.toFixed(2)}</span>
        </p>
      </div>

      {/* Recommendation */}
      {alert.recommended_price && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Suggested</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
            ${alert.recommended_price.toFixed(2)}
          </p>
        </div>
      )}

      {/* Time */}
      <div style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'none', color: 'var(--text-muted)', fontFamily: 'inherit',
  fontSize: 13, cursor: 'pointer',
};
