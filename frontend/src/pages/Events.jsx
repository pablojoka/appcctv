import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, createEvent, deleteEvent } from '../services/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, ArrowUpDown, Trash2, Eye, MapPin, Hash, ChevronUp, ChevronDown } from 'lucide-react';

const STATUS_MAP = {
  a_confirmar: { label: 'A confirmar', cls: 'badge-pending' },
  confirmado:  { label: 'Confirmado',  cls: 'badge-active' },
  finalizado:  { label: 'Finalizado',  cls: 'badge-closed' },
};

const INITIAL_FORM = {
  numero_orden: '', nombre: '', ubicacion: '',
  fecha_armado: '', fecha_inicio: '', fecha_finalizacion: '', notas: '', color: '#e03030'
};

const COLOR_PRESETS = ['#e03030','#e07830','#e0c030','#30a050','#3080e0','#8030e0','#e030a0','#30d0d0'];

export default function Events() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('fecha_inicio');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getEvents().then(r => setEvents(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = events
    .filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.nombre.toLowerCase().includes(q) || e.numero_orden.toLowerCase().includes(q) || (e.ubicacion || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || e.estado === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (sortField.includes('fecha')) { va = new Date(va); vb = new Date(vb); }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createEvent(form);
      toast.success('Evento creado');
      setShowModal(false);
      setForm(INITIAL_FORM);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear evento');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar el evento "${nombre}"?`)) return;
    try {
      await deleteEvent(id);
      toast.success('Evento eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Eventos</h1>
          <p className="page-subtitle">{events.length} evento{events.length !== 1 ? 's' : ''} en total</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo evento
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Buscar por nombre, orden, cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="a_confirmar">A confirmar</option>
          <option value="confirmado">Confirmado</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('numero_orden')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>N° Orden <SortIcon field="numero_orden" /></div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('nombre')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Nombre <SortIcon field="nombre" /></div>
                </th>
                <th>Ubicación</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('fecha_inicio')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Fecha inicio <SortIcon field="fecha_inicio" /></div>
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('fecha_finalizacion')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Fecha fin <SortIcon field="fecha_finalizacion" /></div>
                </th>
                <th>Estado</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sin resultados</td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>
                      #{ev.numero_orden}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{ev.nombre}</td>
                  <td>
                    {ev.ubicacion ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <MapPin size={12} /> {ev.ubicacion}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {ev.fecha_inicio ? format(parseISO(ev.fecha_inicio), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {ev.fecha_finalizacion ? format(parseISO(ev.fecha_finalizacion), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_MAP[ev.estado]?.cls || 'badge-pending'}`}>
                      {STATUS_MAP[ev.estado]?.label || ev.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" title="Ver detalle" onClick={() => navigate(`/events/${ev.id}`)}>
                        <Eye size={14} />
                      </button>
                      {isAdmin && (
                        <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(ev.id, ev.nombre)}
                          style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create event modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Nuevo evento</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">N° de orden *</label>
                    <input className="form-control" required value={form.numero_orden} onChange={e => setForm(p => ({ ...p, numero_orden: e.target.value }))} placeholder="Ej: 2024-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre del evento *</label>
                    <input className="form-control" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del evento" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input className="form-control" value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Lugar del evento" />
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Fecha de armado</label>
                    <input className="form-control" type="date" value={form.fecha_armado} onChange={e => setForm(p => ({ ...p, fecha_armado: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de inicio *</label>
                    <input className="form-control" type="date" required value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de finalización *</label>
                    <input className="form-control" type="date" required value={form.fecha_finalizacion} onChange={e => setForm(p => ({ ...p, fecha_finalizacion: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Color del evento</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {COLOR_PRESETS.map(c => (
                      <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{
                        width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer',
                        border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                        boxShadow: form.color === c ? '0 0 0 2px ' + c : 'none',
                        transition: 'all 0.15s',
                      }} />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                      style={{ width: 32, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', padding: 2 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-control" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones adicionales..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Crear evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
