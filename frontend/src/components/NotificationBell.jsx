import { useState, useEffect, useRef } from 'react';
import { Bell, X, Calendar } from 'lucide-react';
import { getNotifications } from '../services/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function fmtDate(d) {
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: es }); } catch { return d || '—'; }
}

const ESTADO_LABELS = { a_confirmar: 'A confirmar', confirmado: 'Confirmado', finalizado: 'Finalizado' };
const ESTADO_CLS = { a_confirmar: 'badge-pending', confirmado: 'badge-active', finalizado: 'badge-closed' };

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => {
    getNotifications()
      .then(res => setNotifications(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = notifications.length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-icon"
        onClick={() => setOpen(o => !o)}
        title="Notificaciones"
        style={{ position: 'relative', width: 36, height: 36 }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--accent)', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: '0.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, pointerEvents: 'none',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px 12px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>
                Próximos eventos
              </span>
            </div>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => setOpen(false)}>
              <X size={13} />
            </button>
          </div>

          {/* Content */}
          {count === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sin eventos en los próximos 7 días
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {notifications.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setOpen(false); window.location.href = `/events/${ev.id}`; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.nombre}
                    </div>
                    <span className={`badge ${ESTADO_CLS[ev.estado] || 'badge-pending'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                      {ESTADO_LABELS[ev.estado] || ev.estado}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Calendar size={11} />
                      Inicio: {fmtDate(ev.fecha_inicio)}
                    </span>
                    {ev.fecha_armado && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Armado: {fmtDate(ev.fecha_armado)}
                      </span>
                    )}
                  </div>
                  {ev.ubicacion && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {ev.ubicacion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
