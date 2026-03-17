const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications
// Returns events with fecha_inicio or fecha_armado in next 7 days, estado != 'finalizado'
// Admin sees all, personal sees only their assigned events
router.get('/', authMiddleware, (req, res) => {
  const today = new Date();
  const in7days = new Date(today);
  in7days.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().slice(0, 10);
  const in7daysStr = in7days.toISOString().slice(0, 10);

  let events;

  if (req.user.role === 'admin') {
    events = db.prepare(`
      SELECT DISTINCT e.id, e.nombre, e.numero_orden, e.fecha_inicio, e.fecha_armado, e.estado, e.ubicacion
      FROM events e
      WHERE e.estado != 'finalizado'
        AND (
          (e.fecha_inicio >= ? AND e.fecha_inicio <= ?)
          OR
          (e.fecha_armado IS NOT NULL AND e.fecha_armado >= ? AND e.fecha_armado <= ?)
        )
      ORDER BY e.fecha_inicio ASC
    `).all(todayStr, in7daysStr, todayStr, in7daysStr);
  } else {
    events = db.prepare(`
      SELECT DISTINCT e.id, e.nombre, e.numero_orden, e.fecha_inicio, e.fecha_armado, e.estado, e.ubicacion
      FROM events e
      JOIN event_rooms r ON r.event_id = e.id
      JOIN room_staff rs ON rs.room_id = r.id
      WHERE rs.user_id = ?
        AND e.estado != 'finalizado'
        AND (
          (e.fecha_inicio >= ? AND e.fecha_inicio <= ?)
          OR
          (e.fecha_armado IS NOT NULL AND e.fecha_armado >= ? AND e.fecha_armado <= ?)
        )
      ORDER BY e.fecha_inicio ASC
    `).all(req.user.id, todayStr, in7daysStr, todayStr, in7daysStr);
  }

  res.json(events);
});

module.exports = router;
