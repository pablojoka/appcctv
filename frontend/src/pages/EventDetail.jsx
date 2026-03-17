import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, updateEvent, createRoom, deleteRoom, addRoomEquipment, removeRoomEquipment, addRoomStaff, removeRoomStaff, getInventory, getUsers } from '../services/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Edit2, Users, Package, MapPin, Hash, Calendar, FileText, MessageSquare, Copy, Check } from 'lucide-react';

const COLOR_PRESETS = ['#e03030','#e07830','#e0c030','#30a050','#3080e0','#8030e0','#e030a0','#30d0d0'];
import ReportModal from '../components/ReportModal';

const STATUS_OPTS = ['a_confirmar', 'confirmado', 'finalizado'];
const STATUS_LABELS = { a_confirmar: 'A confirmar', confirmado: 'Confirmado', finalizado: 'Finalizado' };
const STATUS_CLS = { a_confirmar: 'badge-pending', confirmado: 'badge-active', finalizado: 'badge-closed' };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({});
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [msgModal, setMsgModal] = useState(null); // { nombre, apellido, puesto, sala }
  const [copied, setCopied] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showAddEquip, setShowAddEquip] = useState(null); // roomId
  const [showAddStaff, setShowAddStaff] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState({}); // { [equipId]: cantidad }
  const [equipSearch, setEquipSearch] = useState('');
  const [staffForm, setStaffForm] = useState({ user_id: '', puesto: '' });

  const load = () => {
    Promise.all([
      getEvent(id),
      isAdmin ? getInventory() : Promise.resolve({ data: [] }),
      isAdmin ? getUsers() : Promise.resolve({ data: [] }),
    ]).then(([evRes, invRes, usersRes]) => {
      setEvent(evRes.data);
      setEventForm(evRes.data);
      setInventory(invRes.data);
      setUsers(usersRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleUpdateEvent = async () => {
    try {
      await updateEvent(id, eventForm);
      toast.success('Evento actualizado');
      setEditingEvent(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await createRoom(id, { nombre: roomName, descripcion: roomDesc });
      toast.success('Sala creada');
      setShowAddRoom(false); setRoomName(''); setRoomDesc('');
      load();
    } catch { toast.error('Error al crear sala'); }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('¿Eliminar esta sala y todo su contenido?')) return;
    try { await deleteRoom(roomId); toast.success('Sala eliminada'); load(); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleAddMultipleEquip = async () => {
    const items = Object.entries(selectedEquip);
    if (!items.length) return;
    try {
      await Promise.all(items.map(([equipment_id, cantidad]) =>
        addRoomEquipment(showAddEquip, { equipment_id, cantidad })
      ));
      toast.success(`${items.length} equipo${items.length > 1 ? 's' : ''} asignado${items.length > 1 ? 's' : ''}`);
      setShowAddEquip(null); setSelectedEquip({}); setEquipSearch('');
      load();
    } catch { toast.error('Error al asignar equipos'); }
  };

  const toggleEquip = (id) => {
    setSelectedEquip(prev => {
      if (prev[id]) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: 1 };
    });
  };

  const handleRemoveEquip = async (id) => {
    try { await removeRoomEquipment(id); load(); }
    catch { toast.error('Error'); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await addRoomStaff(showAddStaff, staffForm);
      toast.success('Personal asignado');
      setShowAddStaff(null); setStaffForm({ user_id: '', puesto: '' });
      load();
    } catch { toast.error('Error al asignar personal'); }
  };

  const handleRemoveStaff = async (id) => {
    try { await removeRoomStaff(id); load(); }
    catch { toast.error('Error'); }
  };

  const buildMessage = ({ nombre, apellido, puesto, sala }) => {
    const fmt = (d) => { try { return format(parseISO(d), "dd/MM/yyyy", { locale: es }); } catch { return d; } };
    const lines = [
      `Hola ${nombre} ${apellido} 👋`,
      ``,
      `Te contactamos desde *Congress CCTV* para confirmarte tu citación al siguiente evento:`,
      ``,
      `📋 *Evento:* ${event.nombre}`,
      event.ubicacion ? `📍 *Ubicación:* ${event.ubicacion}` : null,
      `🏠 *Sala:* ${sala}`,
      `👤 *Tu puesto:* ${puesto}`,
      ``,
      event.fecha_armado ? `🔧 *Fecha de armado:* ${fmt(event.fecha_armado)}` : null,
      `📅 *Fecha de inicio:* ${fmt(event.fecha_inicio)}`,
      `📅 *Fecha de finalización:* ${fmt(event.fecha_finalizacion)}`,
      event.hora_ingreso ? `🕐 *Horario de ingreso:* ${event.hora_ingreso}` : null,
      ``,
      `Por favor confirmá recepción de este mensaje. ¡Muchas gracias!`,
      ``,
      `— *Congress CCTV*`,
    ].filter(l => l !== null);
    return lines.join('\n');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!event) return <div>Evento no encontrado</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <button className="btn-icon" onClick={() => navigate('/events')}><ArrowLeft size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 className="page-title">{event.nombre}</h1>
            <span className={`badge ${STATUS_CLS[event.estado]}`}>{STATUS_LABELS[event.estado]}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <Hash size={12} /> {event.numero_orden}
            </span>
            {event.ubicacion && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <MapPin size={12} /> {event.ubicacion}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <Calendar size={12} />
              {format(parseISO(event.fecha_inicio), 'dd/MM/yyyy')} → {format(parseISO(event.fecha_finalizacion), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingEvent(true)}><Edit2 size={14} /> Editar</button>
            {event.estado !== 'finalizado' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowReport(true)}>
                <FileText size={14} /> Cerrar evento
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingEvent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingEvent(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Editar evento</h2>
              <button className="btn-icon" onClick={() => setEditingEvent(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">N° de orden</label>
                  <input className="form-control" value={eventForm.numero_orden || ''} onChange={e => setEventForm(p => ({ ...p, numero_orden: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={eventForm.nombre || ''} onChange={e => setEventForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input className="form-control" value={eventForm.ubicacion || ''} onChange={e => setEventForm(p => ({ ...p, ubicacion: e.target.value }))} />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Fecha armado</label>
                  <input className="form-control" type="date" value={eventForm.fecha_armado || ''} onChange={e => setEventForm(p => ({ ...p, fecha_armado: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha inicio</label>
                  <input className="form-control" type="date" value={eventForm.fecha_inicio || ''} onChange={e => setEventForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha fin</label>
                  <input className="form-control" type="date" value={eventForm.fecha_finalizacion || ''} onChange={e => setEventForm(p => ({ ...p, fecha_finalizacion: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Horario de ingreso</label>
                <input className="form-control" type="text" placeholder="Ej: 08:00 hs" value={eventForm.hora_ingreso || ''} onChange={e => setEventForm(p => ({ ...p, hora_ingreso: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Color del evento</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(c => (
                    <div key={c} onClick={() => setEventForm(p => ({ ...p, color: c }))} style={{
                      width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer',
                      border: (eventForm.color || '#e03030') === c ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: (eventForm.color || '#e03030') === c ? '0 0 0 2px ' + c : 'none',
                      transition: 'all 0.15s',
                    }} />
                  ))}
                  <input type="color" value={eventForm.color || '#e03030'} onChange={e => setEventForm(p => ({ ...p, color: e.target.value }))}
                    style={{ width: 32, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', padding: 2 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-control" value={eventForm.estado || 'pendiente'} onChange={e => setEventForm(p => ({ ...p, estado: e.target.value }))}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-control" value={eventForm.notas || ''} onChange={e => setEventForm(p => ({ ...p, notas: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingEvent(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdateEvent}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Rooms */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
          Salas ({event.rooms?.length || 0})
        </h2>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddRoom(true)}>
            <Plus size={14} /> Agregar sala
          </button>
        )}
      </div>

      {event.rooms?.length === 0 && (
        <div className="card empty-state"><p>Sin salas. {isAdmin && 'Agregá una sala para comenzar.'}</p></div>
      )}

      {event.rooms?.map(room => (
        <div key={room.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>{room.nombre}</h3>
              {room.descripcion && <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: 3 }}>{room.descripcion}</p>}
            </div>
            {isAdmin && (
              <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => handleDeleteRoom(room.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="room-grid">
            {/* Equipment */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Package size={13} /> Equipos ({room.equipment?.length || 0})
                </div>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => setShowAddEquip(room.id)}>
                    <Plus size={11} /> Agregar
                  </button>
                )}
              </div>
              {room.equipment?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sin equipos asignados</p>
              ) : room.equipment?.map(eq => (
                <div key={eq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{eq.equipo_nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{eq.categoria} · x{eq.cantidad}</div>
                  </div>
                  {isAdmin && (
                    <button className="btn-icon" style={{ width: 26, height: 26, color: 'var(--red)' }} onClick={() => handleRemoveEquip(eq.id)}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Staff */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Users size={13} /> Personal ({room.staff?.length || 0})
                </div>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => setShowAddStaff(room.id)}>
                    <Plus size={11} /> Asignar
                  </button>
                )}
              </div>
              {room.staff?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sin personal asignado</p>
              ) : room.staff?.map(st => (
                <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{st.nombre} {st.apellido}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{st.puesto}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-icon"
                      style={{ width: 26, height: 26 }}
                      title="Generar citación"
                      onClick={() => { setCopied(false); setMsgModal({ nombre: st.nombre, apellido: st.apellido, puesto: st.puesto, sala: room.nombre }); }}
                    >
                      <MessageSquare size={12} />
                    </button>
                    {isAdmin && (
                      <button className="btn-icon" style={{ width: 26, height: 26, color: 'var(--red)' }} onClick={() => handleRemoveStaff(st.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Modals: Add room */}
      {showAddRoom && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddRoom(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h2>Nueva sala</h2><button className="btn-icon" onClick={() => setShowAddRoom(false)}>✕</button></div>
            <form onSubmit={handleAddRoom}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Nombre de la sala *</label>
                  <input className="form-control" required value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Ej: Sala principal, Backstage..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input className="form-control" value={roomDesc} onChange={e => setRoomDesc(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddRoom(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear sala</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add equipment — inventory browser */}
      {showAddEquip && (() => {
        const q = equipSearch.toLowerCase();
        const filtered = q
          ? inventory.filter(eq => eq.nombre.toLowerCase().includes(q) || (eq.marca || '').toLowerCase().includes(q) || (eq.modelo || '').toLowerCase().includes(q))
          : inventory;

        // Group by category
        const groups = filtered.reduce((acc, eq) => {
          const cat = eq.categoria_nombre || 'Sin categoría';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(eq);
          return acc;
        }, {});

        const totalSelected = Object.keys(selectedEquip).length;

        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setShowAddEquip(null), setSelectedEquip({}), setEquipSearch(''))}>
            <div className="modal modal-lg" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div className="modal-header">
                <h2>Agregar equipos a la sala</h2>
                <button className="btn-icon" onClick={() => { setShowAddEquip(null); setSelectedEquip({}); setEquipSearch(''); }}>✕</button>
              </div>

              {/* Search */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
                <div className="search-bar" style={{ width: '100%' }}>
                  <Package size={15} color="var(--text-muted)" />
                  <input
                    style={{ width: '100%', flex: 1 }}
                    placeholder="Buscar por nombre, marca o modelo..."
                    value={equipSearch}
                    onChange={e => setEquipSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Inventory list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {Object.keys(groups).length === 0 ? (
                  <div className="empty-state"><p>Sin resultados</p></div>
                ) : Object.entries(groups).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Package size={13} color="var(--accent)" />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({items.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {items.map(eq => {
                        const checked = !!selectedEquip[eq.id];
                        return (
                          <div
                            key={eq.id}
                            onClick={() => toggleEquip(eq.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 12px', borderRadius: 'var(--radius)',
                              background: checked ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                              border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${checked ? 'var(--accent)' : 'var(--text-muted)'}`,
                              background: checked ? 'var(--accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {checked && <Check size={11} color="#000" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.nombre}</div>
                              {(eq.marca || eq.modelo) && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{[eq.marca, eq.modelo].filter(Boolean).join(' · ')}</div>
                              )}
                            </div>
                            {checked && (
                              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cant.</span>
                                <input
                                  type="number" min={1}
                                  value={selectedEquip[eq.id]}
                                  onChange={e => setSelectedEquip(prev => ({ ...prev, [eq.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                  style={{
                                    width: 52, padding: '4px 8px', borderRadius: 6,
                                    background: 'var(--bg-card)', border: '1px solid var(--accent)',
                                    color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                  {totalSelected > 0 ? `${totalSelected} equipo${totalSelected > 1 ? 's' : ''} seleccionado${totalSelected > 1 ? 's' : ''}` : 'Ningún equipo seleccionado'}
                </span>
                <button className="btn btn-ghost" onClick={() => { setShowAddEquip(null); setSelectedEquip({}); setEquipSearch(''); }}>Cancelar</button>
                <button className="btn btn-primary" disabled={totalSelected === 0} onClick={handleAddMultipleEquip}>
                  <Plus size={14} /> Asignar {totalSelected > 0 ? totalSelected : ''} equipo{totalSelected !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Add staff */}
      {showAddStaff && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddStaff(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h2>Asignar personal</h2><button className="btn-icon" onClick={() => setShowAddStaff(null)}>✕</button></div>
            <form onSubmit={handleAddStaff}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Persona *</label>
                  <select className="form-control" required value={staffForm.user_id} onChange={e => setStaffForm(p => ({ ...p, user_id: e.target.value }))}>
                    <option value="">Seleccionar persona...</option>
                    {users.filter(u => u.role === 'personal').map(u => (
                      <option key={u.id} value={u.id}>{u.apellido}, {u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Puesto *</label>
                  <input className="form-control" required value={staffForm.puesto} onChange={e => setStaffForm(p => ({ ...p, puesto: e.target.value }))} placeholder="Ej: Camarógrafo, Operador vMix..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddStaff(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal eventId={id} eventName={event.nombre} onClose={() => setShowReport(false)} onSuccess={() => { setShowReport(false); load(); }} />
      )}

      {/* Modal: Citación operador */}
      {msgModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMsgModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Citación — {msgModal.nombre} {msgModal.apellido}</h2>
              <button className="btn-icon" onClick={() => setMsgModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <pre style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '16px', fontSize: '0.85rem',
                lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
              }}>
                {buildMessage(msgModal)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMsgModal(null)}>Cerrar</button>
              <button
                className="btn btn-primary"
                onClick={() => handleCopy(buildMessage(msgModal))}
                style={{ minWidth: 130 }}
              >
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
