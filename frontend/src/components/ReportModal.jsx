import { useState, useMemo } from 'react';
import { createRoomReport } from '../services/api';
import { toast } from 'react-toastify';
import { Star, Warehouse, MapPin, Lock } from 'lucide-react';

const CALIDAD_OPTS = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'buena', label: 'Buena' },
  { value: 'regular', label: 'Regular' },
  { value: 'mala', label: 'Mala' },
];

export default function ReportModal({ room, eventName, onClose, onSuccess }) {
  const allEquipment = useMemo(() => room?.equipment || [], [room]);

  const [destinos, setDestinos] = useState(() =>
    Object.fromEntries(allEquipment.map(eq => [eq.id, { destino: 'deposito', predio: '' }]))
  );

  const setDestino = (id, destino) =>
    setDestinos(p => ({ ...p, [id]: { ...p[id], destino } }));
  const setPredio = (id, predio) =>
    setDestinos(p => ({ ...p, [id]: { ...p[id], predio } }));

  const [form, setForm] = useState({
    salio_segun_plan: true,
    problemas_tecnicos: false,
    descripcion_problemas: '',
    calidad_streaming: 'buena',
    personal_suficiente: true,
    equipo_completo: true,
    equipos_con_fallas: '',
    recomendaciones: '',
    nota_general: 5,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sinPredio = allEquipment.filter(eq =>
      destinos[eq.id]?.destino === 'otro' && !destinos[eq.id]?.predio?.trim()
    );
    if (sinPredio.length > 0) {
      toast.error(`Completá el destino para: ${sinPredio.map(e => e.equipo_nombre).join(', ')}`);
      return;
    }
    setSaving(true);
    const destino_equipos = allEquipment.map(eq => ({
      equipment_id: eq.equipment_id,
      nombre: eq.equipo_nombre,
      cantidad: eq.cantidad,
      destino: destinos[eq.id]?.destino || 'deposito',
      predio: destinos[eq.id]?.destino === 'otro' ? destinos[eq.id]?.predio : null,
    }));
    try {
      const res = await createRoomReport({ room_id: room.id, ...form, destino_equipos });
      if (res.data.event_closed) {
        toast.success('Sala cerrada. ¡Evento finalizado automáticamente!');
      } else {
        toast.success('Sala cerrada correctamente.');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar sala');
    } finally { setSaving(false); }
  };

  const BoolField = ({ label, field }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '0.9rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {[true, false].map(val => (
          <button
            key={String(val)}
            type="button"
            onClick={() => setForm(p => ({ ...p, [field]: val }))}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              borderColor: form[field] === val ? (val ? 'var(--green)' : 'var(--red)') : 'var(--border)',
              background: form[field] === val ? (val ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--bg-elevated)',
              color: form[field] === val ? (val ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
            }}
          >
            {val ? 'Sí' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} color="var(--accent)" />
              <h2>Cerrar sala — {room?.nombre}</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>{eventName}</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            <BoolField label="¿La sala salió según lo planeado?" field="salio_segun_plan" />
            <BoolField label="¿Hubo problemas técnicos?" field="problemas_tecnicos" />

            {form.problemas_tecnicos && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Describí los problemas técnicos</label>
                <textarea className="form-control" value={form.descripcion_problemas} onChange={e => setForm(p => ({ ...p, descripcion_problemas: e.target.value }))} placeholder="Detallá qué problemas ocurrieron..." />
              </div>
            )}

            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>Calidad del streaming / grabación</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {CALIDAD_OPTS.map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setForm(p => ({ ...p, calidad_streaming: opt.value }))}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
                        borderColor: form.calidad_streaming === opt.value ? 'var(--accent)' : 'var(--border)',
                        background: form.calidad_streaming === opt.value ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        color: form.calidad_streaming === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <BoolField label="¿El personal fue suficiente?" field="personal_suficiente" />
            <BoolField label="¿El equipo estaba completo?" field="equipo_completo" />

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Equipos con fallas (si hubo)</label>
              <input className="form-control" value={form.equipos_con_fallas} onChange={e => setForm(p => ({ ...p, equipos_con_fallas: e.target.value }))} placeholder="Ej: Cámara Sony A7S, Switch HDMI..." />
            </div>

            <div className="form-group">
              <label className="form-label">Recomendaciones para próximos eventos</label>
              <textarea className="form-control" value={form.recomendaciones} onChange={e => setForm(p => ({ ...p, recomendaciones: e.target.value }))} placeholder="Sugerencias, mejoras, notas importantes..." />
            </div>

            {allEquipment.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Warehouse size={15} color="var(--accent)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>Destino de equipos</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allEquipment.map(eq => {
                    const d = destinos[eq.id] || { destino: 'deposito', predio: '' };
                    return (
                      <div key={eq.id} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{eq.equipo_nombre}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{eq.categoria} · x{eq.cantidad}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {[
                              { value: 'deposito', label: 'Depósito', icon: Warehouse },
                              { value: 'otro', label: 'Otro predio', icon: MapPin },
                            ].map(opt => {
                              const Icon = opt.icon;
                              const active = d.destino === opt.value;
                              return (
                                <button
                                  key={opt.value} type="button"
                                  onClick={() => setDestino(eq.id, opt.value)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '5px 12px', borderRadius: 6, border: '1px solid',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
                                    borderColor: active ? (opt.value === 'deposito' ? 'var(--green)' : 'var(--yellow)') : 'var(--border)',
                                    background: active ? (opt.value === 'deposito' ? 'var(--green-dim)' : 'var(--yellow-dim)') : 'var(--bg-card)',
                                    color: active ? (opt.value === 'deposito' ? 'var(--green)' : 'var(--yellow)') : 'var(--text-muted)',
                                  }}
                                >
                                  <Icon size={12} /> {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {d.destino === 'otro' && (
                          <input
                            className="form-control"
                            style={{ marginTop: 8, fontSize: '0.82rem' }}
                            placeholder="Nombre del predio / evento destino..."
                            value={d.predio}
                            onChange={e => setPredio(eq.id, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Nota general de la sala (1–5)</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setForm(p => ({ ...p, nota_general: n }))}
                    style={{
                      width: 40, height: 40, borderRadius: 8,
                      border: '1px solid', cursor: 'pointer',
                      borderColor: form.nota_general >= n ? 'var(--yellow)' : 'var(--border)',
                      background: form.nota_general >= n ? 'var(--yellow-dim)' : 'var(--bg-elevated)',
                      color: form.nota_general >= n ? 'var(--yellow)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Star size={16} fill={form.nota_general >= n ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: 6 }}>
                  {form.nota_general}/5
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Lock size={14} /> Cerrar sala</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
