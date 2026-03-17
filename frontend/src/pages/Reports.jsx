import { useState, useEffect } from 'react';
import { getReports, getEvents } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Star, CheckCircle, XCircle, Search } from 'lucide-react';
import ReportModal from '../components/ReportModal';

const CALIDAD_LABELS = { excelente: 'Excelente', buena: 'Buena', regular: 'Regular', mala: 'Mala' };
const CALIDAD_CLS = { excelente: 'badge-active', buena: 'badge-pending', regular: 'badge-in-use', mala: 'badge-maintenance' };

export default function Reports() {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showReportFor, setShowReportFor] = useState(null);

  const load = () => {
    const promises = isAdmin
      ? [getReports(), getEvents()]
      : [getReports().catch(() => ({ data: [] })), getEvents()];
    Promise.all(promises)
      .then(([rep, ev]) => { setReports(rep.data); setEvents(ev.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const finishedWithoutReport = events.filter(e =>
    (e.estado === 'finalizado') && !reports.find(r => r.event_id === e.id)
  );

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return !q || r.evento_nombre.toLowerCase().includes(q) || r.numero_orden.toLowerCase().includes(q);
  });

  const BoolIcon = ({ val }) => val
    ? <CheckCircle size={15} color="var(--green)" />
    : <XCircle size={15} color="var(--red)" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">{reports.length} reporte{reports.length !== 1 ? 's' : ''} generados</p>
        </div>
      </div>

      {/* Pending reports */}
      {isAdmin && finishedWithoutReport.length > 0 && (
        <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(255,165,2,0.25)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--yellow)', marginBottom: 10 }}>
            ⚠️ Eventos finalizados sin reporte ({finishedWithoutReport.length})
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {finishedWithoutReport.map(ev => (
              <button key={ev.id} className="btn btn-ghost btn-sm" onClick={() => setShowReportFor(ev)}>
                <FileText size={13} /> {ev.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Buscar por evento o N° orden..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><span className="spinner" style={{ display: 'inline-block', width: 32, height: 32 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><FileText size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin reportes todavía.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onClick={() => setSelected(selected?.id === r.id ? null : r)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>{r.evento_nombre}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 3 }}>
                    #{r.numero_orden} · {r.encargado_nombre ? `${r.encargado_nombre} ${r.encargado_apellido}` : 'Sin encargado'} ·
                    {' '}{format(parseISO(r.created_at), "d 'de' MMM yyyy", { locale: es })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
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
              {selected?.id === r.id && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showReportFor && (
        <ReportModal
          eventId={showReportFor.id}
          eventName={showReportFor.nombre}
          onClose={() => setShowReportFor(null)}
          onSuccess={() => { setShowReportFor(null); load(); }}
        />
      )}
    </div>
  );
}
