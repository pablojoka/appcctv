import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Search, Trash2, Edit2, Users, Phone } from 'lucide-react';

const INIT_FORM = { nombre: '', apellido: '', telefono: '', username: '', password: '', role: 'personal' };

export default function Personnel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    getUsers().then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditUser(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, telefono: u.telefono || '', username: u.username, password: '', role: u.role });
    setShowModal(true);
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
              <UserTable users={admins} onEdit={openEdit} onDelete={handleDelete} />
            </div>
          )}
          {personal.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={15} color="var(--purple)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Operadores / Personal</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({personal.length})</span>
              </div>
              <UserTable users={personal} onEdit={openEdit} onDelete={handleDelete} />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="card empty-state"><Users size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin usuarios que coincidan.</p></div>
          )}
        </>
      )}

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
                <div className="form-group">
                  <label className="form-label">Teléfono / WhatsApp</label>
                  <input className="form-control" type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+54 9 11 ..." />
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
    </div>
  );
}

function UserTable({ users, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Teléfono</th>
            <th>Rol</th>
            <th style={{ width: 80 }}>Acciones</th>
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
                <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-personal'}`}>
                  {u.role === 'admin' ? 'Admin' : 'Personal'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
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
