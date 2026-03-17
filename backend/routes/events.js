const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET all events - admin sees all, personal sees only assigned
router.get('/', authMiddleware, (req, res) => {
  let events;
  if (req.user.role === 'admin') {
    events = db.prepare('SELECT * FROM events ORDER BY fecha_inicio DESC').all();
  } else {
    events = db.prepare(`
      SELECT DISTINCT e.* FROM events e
      JOIN event_rooms r ON r.event_id = e.id
      JOIN room_staff rs ON rs.room_id = r.id
      WHERE rs.user_id = ?
      ORDER BY e.fecha_inicio DESC
    `).all(req.user.id);
  }
  res.json(events);
});

// GET single event with full detail
router.get('/:id', authMiddleware, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  // Check access for personal role
  if (req.user.role !== 'admin') {
    const access = db.prepare(`
      SELECT 1 FROM event_rooms r
      JOIN room_staff rs ON rs.room_id = r.id
      WHERE r.event_id = ? AND rs.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Sin acceso a este evento' });
  }

  const rooms = db.prepare('SELECT * FROM event_rooms WHERE event_id = ?').all(event.id);
  rooms.forEach(room => {
    room.equipment = db.prepare(`
      SELECT re.*, e.nombre as equipo_nombre, e.marca, e.modelo, ec.nombre as categoria
      FROM room_equipment re
      JOIN equipment e ON e.id = re.equipment_id
      LEFT JOIN equipment_categories ec ON ec.id = e.categoria_id
      WHERE re.room_id = ?
    `).all(room.id);

    room.staff = db.prepare(`
      SELECT rs.*, u.nombre, u.apellido, u.telefono
      FROM room_staff rs
      JOIN users u ON u.id = rs.user_id
      WHERE rs.room_id = ?
    `).all(room.id);
  });

  event.rooms = rooms;
  res.json(event);
});

// POST create event (admin only)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { numero_orden, nombre, cliente, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, notas } = req.body;
  if (!numero_orden || !nombre || !fecha_inicio || !fecha_finalizacion)
    return res.status(400).json({ error: 'Campos requeridos: numero_orden, nombre, fecha_inicio, fecha_finalizacion' });

  const exists = db.prepare('SELECT id FROM events WHERE numero_orden = ?').get(numero_orden);
  if (exists) return res.status(409).json({ error: 'Ya existe un evento con ese número de orden' });

  const result = db.prepare(`
    INSERT INTO events (numero_orden, nombre, cliente, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(numero_orden, nombre, cliente || null, ubicacion || null, fecha_armado || null, fecha_inicio, fecha_finalizacion, hora_ingreso || null, notas || null);

  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

// PUT update event (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { numero_orden, nombre, cliente, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, estado, notas } = req.body;
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  db.prepare(`
    UPDATE events SET numero_orden=?, nombre=?, cliente=?, ubicacion=?, fecha_armado=?,
    fecha_inicio=?, fecha_finalizacion=?, hora_ingreso=?, estado=?, notas=? WHERE id=?
  `).run(numero_orden, nombre, cliente || null, ubicacion || null, fecha_armado || null,
    fecha_inicio, fecha_finalizacion, hora_ingreso || null, estado || 'pendiente', notas || null, req.params.id);

  res.json({ success: true });
});

// DELETE event (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ROOMS ---
router.post('/:id/rooms', authMiddleware, adminOnly, (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre de sala requerido' });
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const result = db.prepare('INSERT INTO event_rooms (event_id, nombre, descripcion) VALUES (?, ?, ?)').run(req.params.id, nombre, descripcion || null);
  res.status(201).json({ id: result.lastInsertRowid, event_id: req.params.id, nombre, descripcion });
});

router.put('/rooms/:roomId', authMiddleware, adminOnly, (req, res) => {
  const { nombre, descripcion } = req.body;
  db.prepare('UPDATE event_rooms SET nombre=?, descripcion=? WHERE id=?').run(nombre, descripcion || null, req.params.roomId);
  res.json({ success: true });
});

router.delete('/rooms/:roomId', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM event_rooms WHERE id = ?').run(req.params.roomId);
  res.json({ success: true });
});

// --- ROOM EQUIPMENT ---
router.post('/rooms/:roomId/equipment', authMiddleware, adminOnly, (req, res) => {
  const { equipment_id, cantidad, notas } = req.body;
  const result = db.prepare('INSERT INTO room_equipment (room_id, equipment_id, cantidad, notas) VALUES (?, ?, ?, ?)').run(req.params.roomId, equipment_id, cantidad || 1, notas || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/rooms/equipment/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM room_equipment WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ROOM STAFF ---
router.post('/rooms/:roomId/staff', authMiddleware, adminOnly, (req, res) => {
  const { user_id, puesto } = req.body;
  if (!user_id || !puesto) return res.status(400).json({ error: 'user_id y puesto requeridos' });
  const result = db.prepare('INSERT INTO room_staff (room_id, user_id, puesto) VALUES (?, ?, ?)').run(req.params.roomId, user_id, puesto);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/rooms/staff/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM room_staff WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
