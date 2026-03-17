import { useState, useEffect } from 'react';
import { getInventory, getCategories, createEquipment, updateEquipment, deleteEquipment, createCategory, getEquipmentHistory } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Trash2, Edit2, Package, Tag, History, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO_OPTS = [
  { value: 'disponible', label: 'Disponible', cls: 'badge-available' },
  { value: 'en_uso', label: 'En uso', cls: 'badge-in-use' },
  { value: 'mantenimiento', label: 'Mantenimiento', cls: 'badge-maintenance' },
];

const INIT_FORM = { nombre: '', descripcion: '', marca: '', modelo: '', numero_serie: '', categoria_id: '', estado: 'disponible' };

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [historyModal, setHistoryModal] = useState(null); // { eq, records }
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = () => {
    Promise.all([getInventory(), getCategories()])
      .then(([inv, cats]) => { setInventory(inv.data); setCategories(cats.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditItem(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '', marca: item.marca || '', modelo: item.modelo || '', numero_serie: item.numero_serie || '', categoria_id: item.categoria_id || '', estado: item.estado });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) { await updateEquipment(editItem.id, form); toast.success('Equipo actualizado'); }
      else { await createEquipment(form); toast.success('Equipo agregado'); }
      setShowModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try { await deleteEquipment(id); toast.success('Equipo eliminado'); load(); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try { await createCategory({ nombre: newCat }); toast.success('Categoría creada'); setNewCat(''); setShowCatModal(false); load(); }
    catch { toast.error('Error'); }
  };

  const filtered = inventory.filter(eq => {
    const q = search.toLowerCase();
    const matchSearch = !q || eq.nombre.toLowerCase().includes(q) || (eq.marca || '').toLowerCase().includes(q) || (eq.modelo || '').toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || String(eq.categoria_id) === catFilter;
    return matchSearch && matchCat;
  });

  // Group by category
  const grouped = categories.reduce((acc, cat) => {
    const items = filtered.filter(eq => eq.categoria_id === cat.id);
    if (items.length > 0) acc.push({ cat, items });
    return acc;
  }, []);
  const uncategorized = filtered.filter(eq => !eq.categoria_id);
  if (uncategorized.length > 0) grouped.push({ cat: { id: null, nombre: 'Sin categoría' }, items: uncategorized });

  const estadoInfo = (e) => ESTADO_OPTS.find(o => o.value === e) || ESTADO_OPTS[0];

  const openHistory = async (eq) => {
    setHistoryLoading(true);
    setHistoryModal({ eq, records: [] });
    try {
      const res = await getEquipmentHistory(eq.id);
      setHistoryModal({ eq, records: res.data });
    } catch { setHistoryModal({ eq, records: [] }); }
    finally { setHistoryLoading(false); }
  };

  const fmt = (d) => { try { return format(parseISO(d), "dd/MM/yyyy", { locale: es }); } catch { return d; } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">{inventory.length} equipos en {categories.length} categorías</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowCatModal(true)}><Tag size={15} /> Nueva categoría</button>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Nuevo equipo</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Buscar equipo, marca, modelo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><span className="spinner" style={{ display: 'inline-block', width: 32, height: 32 }} /></div>
      ) : grouped.length === 0 ? (
        <div className="card empty-state"><Package size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin equipos{search ? ' que coincidan con la búsqueda' : ''}.</p></div>
      ) : grouped.map(({ cat, items }) => (
        <div key={cat.id || 'none'} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Package size={15} color="var(--accent)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{cat.nombre}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({items.length})</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Marca / Modelo</th>
                  <th>N° Serie</th>
                  <th>Estado</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(eq => {
                  const est = estadoInfo(eq.estado);
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{eq.nombre}</div>
                        {eq.descripcion && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{eq.descripcion}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '0.7rem' }}>
                          {cat.nombre}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {[eq.marca, eq.modelo].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{eq.numero_serie || '—'}</td>
                      <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" title="Ver historial" onClick={() => openHistory(eq)}><History size={13} /></button>
                          {isAdmin && <>
                            <button className="btn-icon" onClick={() => openEdit(eq)}><Edit2 size={13} /></button>
                            <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => handleDelete(eq.id, eq.nombre)}><Trash2 size={13} /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Equipment modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editItem ? 'Editar equipo' : 'Nuevo equipo'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="form-control" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-control" value={form.categoria_id} onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))}>
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input className="form-control" value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modelo</label>
                    <input className="form-control" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">N° de serie</label>
                    <input className="form-control" value={form.numero_serie} onChange={e => setForm(p => ({ ...p, numero_serie: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-control" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                      {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-control" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHistoryModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h2>Historial — {historyModal.eq.nombre}</h2>
                {historyModal.eq.marca && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{historyModal.eq.marca} {historyModal.eq.modelo}</div>}
              </div>
              <button className="btn-icon" onClick={() => setHistoryModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block', width: 28, height: 28 }} /></div>
              ) : historyModal.records.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <History size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                  <p>Este equipo no fue asignado a ningún evento todavía.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Evento</th>
                        <th>Sala</th>
                        <th>Cliente</th>
                        <th>Fechas</th>
                        <th>Cant.</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyModal.records.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.sala}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.cliente || '—'}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Calendar size={11} />
                              {fmt(r.fecha_inicio)} → {fmt(r.fecha_finalizacion)}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>x{r.cantidad}</td>
                          <td>
                            <span className={`badge ${r.estado === 'finalizado' ? 'badge-closed' : r.estado === 'confirmado' ? 'badge-active' : 'badge-pending'}`} style={{ fontSize: '0.68rem' }}>
                              {{ a_confirmar: 'A confirmar', confirmado: 'Confirmado', finalizado: 'Finalizado' }[r.estado] || r.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                {historyModal.records.length} evento{historyModal.records.length !== 1 ? 's' : ''} en total
              </span>
              <button className="btn btn-ghost" onClick={() => setHistoryModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header"><h2>Nueva categoría</h2><button className="btn-icon" onClick={() => setShowCatModal(false)}>✕</button></div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la categoría</label>
                  <input className="form-control" required value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Ej: Cámaras, Switchers..." autoFocus />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCatModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
