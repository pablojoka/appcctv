import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getUserHistory, deleteUserHistory } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Search, Trash2, Edit2, Users, Phone, History, Calendar, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const INIT_FORM = { nombre: '', apellido: '', telefono: '', email: '', username: '', password: '', role: 'personal' };

const STATUS_CLS = { a_confirmar: 'badge-pending', confirmado: 'badge-active', finalizado: 'badge-closed' };
const STATUS_LABELS = { a_confirmar: 'A confirmar', confirmado: 'Confirmado', finalizado: 'Finalizado' };

export default function Personnel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [historyModal, setHistoryModal] = useState(null); // { user, records }
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = () => {
    getUsers().then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditUser(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono || '', email: u.email || '', username: u.username, password: '', role: u.role });
    setShowModal(true);
  };

  const openHistory = async (u) => {
    setHistoryLoading(true);
    setHistoryModal({ user: u, records: [] });
    try {
      const res = await getUserHistory(u.id);
      setHistoryModal({ user: u, records: res.data });
    } catch { setHistoryModal({ user: u, records: [] }); }
    finally { setHistoryLoading(false); }
  };

  const handleDeleteHistory = async (assignmentId, userId) => {
    if (!confirm('¿Eliminar este registro del historial? Esto también quitará al operador del evento.')) return;
    try {
      await deleteUserHistory(assignmentId);
      const res = await getUserHistory(userId);
      setHistoryModal(prev => ({ ...prev, records: res.data }));
      toast.success('Registro eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) { await updateUser(editUser.id, form); toast.success('Usuario actualizado'); }
      else { await createUser(form); toast.success('Usuario creado'); }
      setShowModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    try { await deleteUser(id); toast.success('Usuario eliminado'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar'); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.nombre.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const admins = filtered.filter(u => u.role === 'admin');
  const personal = filtered.filter(u => u.role === 'personal');
  const fmt = (d) => { try { return format(parseISO(d), "dd/MM/yyyy", { locale: es }); } catch { return d; } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personal</h1>
          <p className="page-subtitle">{users.filter(u => u.role === 'personal').length} operadores, {users.filter(u => u.role === 'admin').length} administradores</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Nuevo usuario</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Buscar por nombre o usuario..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><span className="spinner" style={{ display: 'inline-block', width: 32, height: 32 }} /></div>
      ) : (
        <>
          {admins.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={15} color="var(--accent)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Administradores</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({admins.length})</span>
              </div>
              <UserTable users={admins} onEdit={openEdit} onDelete={handleDelete} onHistory={openHistory} />
            </div>
          )}
          {personal.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={15} color="var(--purple)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Operadores / Personal</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({personal.length})</span>
              </div>
              <UserTable users={personal} onEdit={openEdit} onDelete={handleDelete} onHistory={openHistory} />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="card empty-state"><Users size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin usuarios que coincidan.</p></div>
          )}
        </>
      )}

      {/* User form modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{editUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
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
                    <label className="form-label">Apellido *</label>
                    <input className="form-control" required value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp</label>
                    <input className="form-control" type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+54 9 11 ..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Usuario (login) *</label>
                    <input className="form-control" required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} disabled={!!editUser} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{editUser ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                    <input className="form-control" type="password" required={!editUser} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={editUser ? 'Dejar vacío para no cambiar' : ''} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="personal">Personal / Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
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
                <h2>Historial — {historyModal.user.nombre} {historyModal.user.apellido}</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>@{historyModal.user.username}</div>
              </div>
              <button className="btn-icon" onClick={() => setHistoryModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block', width: 28, height: 28 }} /></div>
              ) : historyModal.records.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <History size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                  <p>Este operador no fue asignado a ningún evento todavía.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Evento</th>
                        <th>Sala</th>
                        <th>Puesto</th>
                        <th>Fechas</th>
                        <th>Estado</th>
                        <th style={{ width: 50 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyModal.records.map((r, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {r.color && <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />}
                              <span style={{ fontWeight: 600 }}>{r.nombre}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.sala}</td>
                          <td><span style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>{r.puesto}</span></td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Calendar size={11} />
                              {fmt(r.fecha_inicio)} → {fmt(r.fecha_finalizacion)}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_CLS[r.estado] || 'badge-pending'}`} style={{ fontSize: '0.68rem' }}>
                              {STATUS_LABELS[r.estado] || r.estado}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon" style={{ color: 'var(--red)' }} title="Eliminar del historial" onClick={() => handleDeleteHistory(r.assignment_id, historyModal.user.id)}>
                              <Trash2 size={13} />
                            </button>
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
    </div>
  );
}

function UserTable({ users, onEdit, onDelete, onHistory }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Rol</th>
            <th style={{ width: 110 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 600 }}>{u.apellido}, {u.nombre}</td>
              <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>@{u.username}</td>
              <td>
                {u.telefono ? (
                  <a href={`tel:${u.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    <Phone size={12} /> {u.telefono}
                  </a>
                ) : '—'}
              </td>
              <td>
                {u.email ? (
                  <a href={`mailto:${u.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    <Mail size={12} /> {u.email}
                  </a>
                ) : '—'}
              </td>
              <td>
                <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-personal'}`}>
                  {u.role === 'admin' ? 'Admin' : 'Personal'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon" title="Ver historial" onClick={() => onHistory(u)}><History size={13} /></button>
                  <button className="btn-icon" onClick={() => onEdit(u)}><Edit2 size={13} /></button>
                  <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => onDelete(u.id, `${u.nombre} ${u.apellido}`)}><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
