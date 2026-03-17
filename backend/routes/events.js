const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// --- PHOTOS UPLOAD SETUP ---
const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'photos');
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTOS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, unique + ext);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// =====================================================
// STATIC-PREFIX ROUTES (must be before /:id routes)
// =====================================================

// --- ROOMS ---
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
  if (!equipment_id) return res.status(400).json({ error: 'equipment_id requerido' });

  const room = db.prepare('SELECT event_id FROM event_rooms WHERE id = ?').get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const event = db.prepare('SELECT id, nombre, fecha_inicio, fecha_finalizacion FROM events WHERE id = ?').get(room.event_id);

  const conflict = db.prepare(`
    SELECT e.nombre, e.fecha_inicio, e.fecha_finalizacion
    FROM room_equipment re
    JOIN event_rooms er ON er.id = re.room_id
    JOIN events e ON e.id = er.event_id
    WHERE re.equipment_id = ? AND e.id != ?
      AND e.fecha_inicio <= ? AND e.fecha_finalizacion >= ?
  `).get(equipment_id, event.id, event.fecha_finalizacion, event.fecha_inicio);

  if (conflict) {
    return res.status(409).json({
      error: `Conflicto: este equipo ya está asignado al evento "${conflict.nombre}" (${conflict.fecha_inicio} → ${conflict.fecha_finalizacion})`
    });
  }

  const result = db.prepare('INSERT INTO room_equipment (room_id, equipment_id, cantidad, notas) VALUES (?, ?, ?, ?)').run(req.params.roomId, equipment_id, cantidad || 1, notas || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update checkout status (admin only)
router.put('/rooms/equipment/:id/checkout', authMiddleware, adminOnly, (req, res) => {
  const { checkout_status, fecha_entrega, fecha_devolucion } = req.body;
  const entry = db.prepare('SELECT id FROM room_equipment WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Registro no encontrado' });

  db.prepare(`
    UPDATE room_equipment
    SET checkout_status = ?, fecha_entrega = ?, fecha_devolucion = ?
    WHERE id = ?
  `).run(checkout_status || 'pendiente', fecha_entrega || null, fecha_devolucion || null, req.params.id);

  res.json({ success: true });
});

router.delete('/rooms/equipment/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM room_equipment WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ROOM STAFF ---
router.post('/rooms/:roomId/staff', authMiddleware, adminOnly, (req, res) => {
  const { user_id, puesto } = req.body;
  if (!user_id || !puesto) return res.status(400).json({ error: 'user_id y puesto requeridos' });

  const room = db.prepare('SELECT event_id FROM event_rooms WHERE id = ?').get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const event = db.prepare('SELECT id, nombre, fecha_inicio, fecha_finalizacion FROM events WHERE id = ?').get(room.event_id);

  const conflict = db.prepare(`
    SELECT e.nombre, e.fecha_inicio, e.fecha_finalizacion
    FROM room_staff rs
    JOIN event_rooms er ON er.id = rs.room_id
    JOIN events e ON e.id = er.event_id
    WHERE rs.user_id = ? AND e.id != ?
      AND e.fecha_inicio <= ? AND e.fecha_finalizacion >= ?
  `).get(user_id, event.id, event.fecha_finalizacion, event.fecha_inicio);

  if (conflict) {
    return res.status(409).json({
      error: `Conflicto: esta persona ya está asignada al evento "${conflict.nombre}" (${conflict.fecha_inicio} → ${conflict.fecha_finalizacion})`
    });
  }

  const result = db.prepare('INSERT INTO room_staff (room_id, user_id, puesto) VALUES (?, ?, ?)').run(req.params.roomId, user_id, puesto);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/rooms/staff/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM room_staff WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- PHOTO ROUTES (static prefix /photos — must be before /:id) ---

// GET /api/events/photos/:id/file — serve photo file
router.get('/photos/:id/file', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { jwt.verify(token, process.env.JWT_SECRET || 'congress_cctv_secret_2024'); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }

  const photo = db.prepare('SELECT * FROM event_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

  const filePath = path.join(PHOTOS_DIR, photo.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });

  const ext = path.extname(photo.filename).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mime = mimeMap[ext] || 'image/jpeg';

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${photo.original_name}"`);
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/events/photos/:id — delete a photo (admin or uploader)
router.delete('/photos/:id', authMiddleware, (req, res) => {
  const photo = db.prepare('SELECT * FROM event_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

  if (req.user.role !== 'admin' && photo.uploaded_by !== req.user.id) {
    return res.status(403).json({ error: 'No tenés permiso para eliminar esta foto' });
  }

  const filePath = path.join(PHOTOS_DIR, photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM event_photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// =====================================================
// DYNAMIC /:id ROUTES
// =====================================================

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
  const { numero_orden, nombre, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, color, notas } = req.body;
  if (!numero_orden || !nombre || !fecha_inicio || !fecha_finalizacion)
    return res.status(400).json({ error: 'Campos requeridos: numero_orden, nombre, fecha_inicio, fecha_finalizacion' });

  const exists = db.prepare('SELECT id FROM events WHERE numero_orden = ?').get(numero_orden);
  if (exists) return res.status(409).json({ error: 'Ya existe un evento con ese número de orden' });

  const result = db.prepare(`
    INSERT INTO events (numero_orden, nombre, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, color, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(numero_orden, nombre, ubicacion || null, fecha_armado || null, fecha_inicio, fecha_finalizacion, hora_ingreso || null, color || null, notas || null);

  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

// PUT update event (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { numero_orden, nombre, ubicacion, fecha_armado, fecha_inicio, fecha_finalizacion, hora_ingreso, color, estado, notas } = req.body;
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  db.prepare(`
    UPDATE events SET numero_orden=?, nombre=?, ubicacion=?, fecha_armado=?,
    fecha_inicio=?, fecha_finalizacion=?, hora_ingreso=?, color=?, estado=?, notas=? WHERE id=?
  `).run(numero_orden, nombre, ubicacion || null, fecha_armado || null,
    fecha_inicio, fecha_finalizacion, hora_ingreso || null, color || null, estado || 'a_confirmar', notas || null, req.params.id);

  res.json({ success: true });
});

// DELETE event (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST add room to event
router.post('/:id/rooms', authMiddleware, adminOnly, (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre de sala requerido' });
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const result = db.prepare('INSERT INTO event_rooms (event_id, nombre, descripcion) VALUES (?, ?, ?)').run(req.params.id, nombre, descripcion || null);
  res.status(201).json({ id: result.lastInsertRowid, event_id: req.params.id, nombre, descripcion });
});

// GET /api/events/:id/photos — list photos for an event
router.get('/:id/photos', authMiddleware, (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  if (req.user.role !== 'admin') {
    const access = db.prepare(`
      SELECT 1 FROM event_rooms r
      JOIN room_staff rs ON rs.room_id = r.id
      WHERE r.event_id = ? AND rs.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Sin acceso a este evento' });
  }

  const photos = db.prepare(`
    SELECT ep.*, u.nombre as uploader_nombre, u.apellido as uploader_apellido
    FROM event_photos ep
    LEFT JOIN users u ON u.id = ep.uploaded_by
    WHERE ep.event_id = ?
    ORDER BY ep.created_at DESC
  `).all(req.params.id);

  res.json(photos);
});

// POST /api/events/:id/photos — upload a photo (auth, any role)
router.post('/:id/photos', authMiddleware, photoUpload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });

  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  if (req.user.role !== 'admin') {
    const access = db.prepare(`
      SELECT 1 FROM event_rooms r
      JOIN room_staff rs ON rs.room_id = r.id
      WHERE r.event_id = ? AND rs.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!access) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Sin acceso a este evento' });
    }
  }

  const { caption } = req.body;
  const result = db.prepare(`
    INSERT INTO event_photos (event_id, filename, original_name, caption, uploaded_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, req.file.filename, req.file.originalname, caption || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, filename: req.file.filename, original_name: req.file.originalname });
});

module.exports = router;
