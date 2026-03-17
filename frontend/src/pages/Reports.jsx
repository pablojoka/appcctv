import { useState, useEffect } from 'react';
import { getReports } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Star, CheckCircle, XCircle, Search, Lock, Warehouse, MapPin } from 'lucide-react';

const CALIDAD_LABELS = { excelente: 'Excelente', buena: 'Buena', regular: 'Regular', mala: 'Mala' };
const CALIDAD_CLS = { excelente: 'badge-active', buena: 'badge-pending', regular: 'badge-in-use', mala: 'badge-maintenance' };

export default function Reports() {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null); // room_report id

  const load = () => {
    getReports()
      .then(r => setReports(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return !q || r.evento_nombre.toLowerCase().includes(q) || r.numero_orden.toLowerCase().includes(q) || r.sala_nombre.toLowerCase().includes(q);
  });

  // Group by event
  const grouped = filtered.reduce((acc, r) => {
    const key = r.event_id;
    if (!acc[key]) acc[key] = { evento_nombre: r.evento_nombre, numero_orden: r.numero_orden, fecha_inicio: r.fecha_inicio, rooms: [] };
    acc[key].rooms.push(r);
    return acc;
  }, {});

  const BoolIcon = ({ val }) => val
    ? <CheckCircle size={15} color="var(--green)" />
    : <XCircle size={15} color="var(--red)" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">{reports.length} sala{reports.length !== 1 ? 's' : ''} cerrada{reports.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Buscar por evento, sala o N° orden..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><span className="spinner" style={{ display: 'inline-block', width: 32, height: 32 }} /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card empty-state"><FileText size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin reportes todavía.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.values(grouped).map((group, gi) => (
            <div key={gi}>
              {/* Event header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <FileText size={15} color="var(--accent)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  {group.evento_nombre}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  #{group.numero_orden} · {group.fecha_inicio ? format(parseISO(group.fecha_inicio), "d MMM yyyy", { locale: es }) : ''}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                  {group.rooms.length} sala{group.rooms.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Room reports */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.rooms.map(r => (
                  <div key={r.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', borderLeft: `3px solid var(--accent)` }}
                    onClick={() => setSelected(selected === r.id ? null : r.id)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* Room header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <Lock size={13} color="var(--text-muted)" />
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>{r.sala_nombre}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {r.encargado_nombre ? `${r.encargado_nombre} ${r.encargado_apellido}` : 'Sin encargado'} ·{' '}
                          {format(parseISO(r.created_at), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.calidad_streaming && (
                          <span className={`badge ${CALIDAD_CLS[r.calidad_streaming] || 'badge-pending'}`}>
                            {CALIDAD_LABELS[r.calidad_streaming]}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={13} color="var(--yellow)" fill={r.nota_general >= n ? 'var(--yellow)' : 'none'} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Summary chips */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <BoolIcon val={r.salio_segun_plan} /> Según plan
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <BoolIcon val={!r.problemas_tecnicos} /> Sin problemas técnicos
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <BoolIcon val={r.personal_suficiente} /> Personal suficiente
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <BoolIcon val={r.equipo_completo} /> Equipo completo
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {selected === r.id && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                        <div className="grid-2" style={{ gap: 20 }}>
                          {r.descripcion_problemas && (
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Problemas técnicos</div>
                              <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)' }}>{r.descripcion_problemas}</p>
                            </div>
                          )}
                          {r.equipos_con_fallas && (
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Equipos con fallas</div>
                              <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)' }}>{r.equipos_con_fallas}</p>
                            </div>
                          )}
                          {r.recomendaciones && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recomendaciones</div>
                              <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)' }}>{r.recomendaciones}</p>
                            </div>
                          )}
                          {r.destino_equipos && (() => {
                            try {
                              const dest = JSON.parse(r.destino_equipos);
                              const otros = dest.filter(d => d.destino === 'otro');
                              if (!otros.length) return null;
                              return (
                                <div style={{ gridColumn: '1/-1' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Equipos a otro predio</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {otros.map((d, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                                        <MapPin size={12} color="var(--yellow)" />
                                        <span style={{ fontWeight: 600 }}>{d.nombre}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                        <span style={{ color: 'var(--yellow)' }}>{d.predio}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            } catch { return null; }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
