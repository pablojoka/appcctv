import { useState, useEffect } from 'react';
import { BarChart2, Package, Users } from 'lucide-react';
import { getEquipmentStats, getOperatorStats } from '../services/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: es }); } catch { return d; }
}

export default function Stats() {
  const [tab, setTab] = useState('equipos');
  const [equipment, setEquipment] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getEquipmentStats(), getOperatorStats()])
      .then(([eqRes, opRes]) => {
        setEquipment(eqRes.data);
        setOperators(opRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabStyle = (active) => ({
    padding: '8px 20px',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '0.87rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
    color: active ? '#fff' : 'var(--text-secondary)',
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <BarChart2 size={22} color="var(--accent)" />
        <h1 className="page-title">Estadísticas</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle(tab === 'equipos')} onClick={() => setTab('equipos')}>
          <Package size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Equipos
        </button>
        <button style={tabStyle(tab === 'operadores')} onClick={() => setTab('operadores')}>
          <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Operadores
        </button>
      </div>

      {/* Equipos tab */}
      {tab === 'equipos' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} color="var(--accent)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
              Uso de equipos
            </h2>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {equipment.length} equipos
            </span>
          </div>
          {equipment.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>Sin datos de uso disponibles</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Nombre</th>
                    <th style={thStyle}>Categoría</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Total usos</th>
                    <th style={thStyle}>Último uso</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((eq, idx) => {
                    const isTop5 = idx < 5 && eq.total_usos > 0;
                    return (
                      <tr
                        key={eq.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isTop5 ? 'rgba(48, 160, 80, 0.07)' : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => !isTop5 && (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseLeave={e => !isTop5 && (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', width: 40 }}>
                          {isTop5 ? (
                            <span style={{ color: '#30a050', fontWeight: 700 }}>{idx + 1}</span>
                          ) : idx + 1}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{eq.nombre}</div>
                          {(eq.marca || eq.modelo) && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                              {[eq.marca, eq.modelo].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{eq.categoria || '—'}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            background: isTop5 ? 'rgba(48,160,80,0.18)' : 'var(--bg-elevated)',
                            color: isTop5 ? '#30a050' : 'var(--text-primary)',
                            fontWeight: 700, fontSize: '0.92rem',
                            padding: '3px 12px', borderRadius: 20,
                            minWidth: 36, textAlign: 'center',
                          }}>
                            {eq.total_usos}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {fmtDate(eq.ultimo_uso)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Operadores tab */}
      {tab === 'operadores' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="var(--accent)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
              Actividad de operadores
            </h2>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {operators.length} operadores
            </span>
          </div>
          {operators.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>Sin operadores registrados</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Operador</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Total eventos</th>
                    <th style={thStyle}>Último evento</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op, idx) => (
                    <tr
                      key={op.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', width: 40 }}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>
                          {op.apellido}, {op.nombre}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          background: 'var(--bg-elevated)',
                          fontWeight: 700, fontSize: '0.92rem',
                          padding: '3px 12px', borderRadius: 20,
                          minWidth: 36, textAlign: 'center',
                        }}>
                          {op.total_eventos}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {fmtDate(op.ultimo_evento)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 16px',
  textAlign: 'left',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: '0.87rem',
  verticalAlign: 'middle',
};
