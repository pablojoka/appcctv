import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../services/api';
import { format, parseISO, isSameDay, isToday, isTomorrow, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

const STATUS_MAP = {
  a_confirmar: { label: 'A confirmar', cls: 'badge-pending' },
  confirmado:  { label: 'Confirmado',  cls: 'badge-active' },
  finalizado:  { label: 'Finalizado',  cls: 'badge-closed' },
};

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    getEvents().then(r => setEvents(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = (getDay(startOfMonth(currentMonth)) + 6) % 7; // Monday-first

  const getEventsForDay = (day) =>
    events.filter(e => {
      try {
        const start = e.fecha_armado ? parseISO(e.fecha_armado) : parseISO(e.fecha_inicio);
        const end = parseISO(e.fecha_finalizacion);
        return day >= start && day <= end;
      } catch { return false; }
    });

  const isArmadoDay = (day, ev) => {
    if (!ev.fecha_armado) return false;
    try {
      const armado = parseISO(ev.fecha_armado);
      const inicio = parseISO(ev.fecha_inicio);
      return day >= armado && day < inicio;
    } catch { return false; }
  };

  const COLOR_PALETTE = ['#e03030','#e07830','#e0c030','#30a050','#3080e0','#8030e0','#e030a0','#30d0d0'];
  const getColor = (ev) => ev.color || COLOR_PALETTE[ev.id % COLOR_PALETTE.length];

  const upcomingEvents = [...events]
    .filter(e => e.estado !== 'finalizado')
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
    .slice(0, 6);

  const stats = {
    total: events.length,
    activos: events.filter(e => e.estado === 'confirmado').length,
    pendientes: events.filter(e => e.estado === 'a_confirmar').length,
    cerrados: events.filter(e => e.estado === 'finalizado').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.total}</div>
          <div className="stat-label">Total eventos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.activos}</div>
          <div className="stat-label">Confirmados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{stats.pendientes}</div>
          <div className="stat-label">A confirmar</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{stats.cerrados}</div>
          <div className="stat-label">Finalizados</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Calendar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft size={16} />
              </button>
              <button className="btn-icon" onClick={() => setCurrentMonth(new Date())}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0 4px' }}>HOY</span>
              </button>
              <button className="btn-icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Empty cells */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map(day => {
              const dayEvents = getEventsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toString()}
                  style={{
                    minHeight: 64, padding: '6px', borderRadius: 8,
                    background: today ? 'var(--accent-dim)' : dayEvents.length > 0 ? 'var(--bg-elevated)' : 'transparent',
                    border: today ? '1px solid var(--accent)' : '1px solid transparent',
                    cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (dayEvents.length > 0) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (!today) e.currentTarget.style.background = dayEvents.length > 0 ? 'var(--bg-elevated)' : 'transparent'; }}
                >
                  <div style={{
                    fontSize: '0.8rem', fontWeight: today ? 700 : 400,
                    color: today ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 4
                  }}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => {
                    const color = getColor(ev);
                    const armado = isArmadoDay(day, ev);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => navigate(`/events/${ev.id}`)}
                        style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '2px 5px',
                          borderRadius: 4, marginBottom: 2, cursor: 'pointer',
                          background: color + (armado ? '28' : '33'),
                          color: color,
                          border: `1px solid ${color}${armado ? '50' : '80'}`,
                          opacity: armado ? 0.8 : 1,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}
                        title={ev.nombre + (armado ? ' (armado)' : '')}
                      >
                        {armado ? '🔧 ' : ''}{ev.nombre}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{dayEvents.length - 2} más</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>
            Próximos eventos
          </h2>
          {upcomingEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Activity size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
              <p>Sin eventos próximos</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{ev.nombre}</div>
                    <span className={`badge ${STATUS_MAP[ev.estado]?.cls || 'badge-pending'}`} style={{ fontSize: '0.65rem' }}>
                      {STATUS_MAP[ev.estado]?.label || ev.estado}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      {format(parseISO(ev.fecha_inicio), "d MMM", { locale: es })} — {format(parseISO(ev.fecha_finalizacion), "d MMM yyyy", { locale: es })}
                    </div>
                    {ev.ubicacion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <MapPin size={11} /> {ev.ubicacion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
