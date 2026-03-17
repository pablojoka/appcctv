const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET all room reports (admin only)
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const reports = db.prepare(`
    SELECT rr.*, er.nombre as sala_nombre, er.event_id,
           e.nombre as evento_nombre, e.numero_orden, e.fecha_inicio,
           u.nombre as encargado_nombre, u.apellido as encargado_apellido
    FROM room_reports rr
    JOIN event_rooms er ON er.id = rr.room_id
    JOIN events e ON e.id = er.event_id
    LEFT JOIN users u ON u.id = rr.encargado_id
    ORDER BY rr.created_at DESC
  `).all();
  res.json(reports);
});

// GET room reports for a specific event
router.get('/event/:eventId', authMiddleware, (req, res) => {
  const reports = db.prepare(`
    SELECT rr.*, er.nombre as sala_nombre,
           u.nombre as encargado_nombre, u.apellido as encargado_apellido
    FROM room_reports rr
    JOIN event_rooms er ON er.id = rr.room_id
    LEFT JOIN users u ON u.id = rr.encargado_id
    WHERE er.event_id = ?
    ORDER BY rr.created_at DESC
  `).all(req.params.eventId);
  res.json(reports);
});

// GET single room report by room_id
router.get('/room/:roomId', authMiddleware, (req, res) => {
  const report = db.prepare(`
    SELECT rr.*, er.nombre as sala_nombre, er.event_id,
           e.nombre as evento_nombre, e.numero_orden,
           u.nombre as encargado_nombre, u.apellido as encargado_apellido
    FROM room_reports rr
    JOIN event_rooms er ON er.id = rr.room_id
    JOIN events e ON e.id = er.event_id
    LEFT JOIN users u ON u.id = rr.encargado_id
    WHERE rr.room_id = ?
  `).get(req.params.roomId);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(report);
});

// POST create room report and close room (admin or assigned staff)
router.post('/rooms', authMiddleware, (req, res) => {
  const {
    room_id,
    salio_segun_plan,
    problemas_tecnicos,
    descripcion_problemas,
    calidad_streaming,
    personal_suficiente,
    equipo_completo,
    equipos_con_fallas,
    recomendaciones,
    nota_general,
    destino_equipos
  } = req.body;

  if (!room_id) return res.status(400).json({ error: 'room_id requerido' });

  const room = db.prepare('SELECT * FROM event_rooms WHERE id = ?').get(room_id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

  const existing = db.prepare('SELECT id FROM room_reports WHERE room_id = ?').get(room_id);
  if (existing) return res.status(409).json({ error: 'Ya existe un reporte para esta sala' });

  // Create report
  const result = db.prepare(`
    INSERT INTO room_reports (room_id, encargado_id, salio_segun_plan, problemas_tecnicos,
      descripcion_problemas, calidad_streaming, personal_suficiente, equipo_completo,
      equipos_con_fallas, recomendaciones, nota_general, destino_equipos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    room_id, req.user.id,
    salio_segun_plan ? 1 : 0, problemas_tecnicos ? 1 : 0,
    descripcion_problemas || null, calidad_streaming || null,
    personal_suficiente ? 1 : 0, equipo_completo ? 1 : 0,
    equipos_con_fallas || null, recomendaciones || null, nota_general || null,
    destino_equipos ? JSON.stringify(destino_equipos) : null
  );

  // Close the room
  db.prepare("UPDATE event_rooms SET estado = 'cerrada' WHERE id = ?").run(room_id);

  // Check if all rooms of the event are closed → auto-close event
  const openRooms = db.prepare(
    "SELECT COUNT(*) as cnt FROM event_rooms WHERE event_id = ? AND estado = 'abierta'"
  ).get(room.event_id);

  if (openRooms.cnt === 0) {
    db.prepare("UPDATE events SET estado = 'finalizado' WHERE id = ?").run(room.event_id);
  }

  res.status(201).json({ id: result.lastInsertRowid, success: true, event_closed: openRooms.cnt === 0 });
});

module.exports = router;
