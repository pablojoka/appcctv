const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/stats/equipment (admin only)
// For each equipment: id, nombre, marca, modelo, categoria, total_usos, ultimo_uso
router.get('/equipment', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT
      e.id,
      e.nombre,
      e.marca,
      e.modelo,
      ec.nombre AS categoria,
      COUNT(re.id) AS total_usos,
      MAX(ev.fecha_inicio) AS ultimo_uso
    FROM equipment e
    LEFT JOIN equipment_categories ec ON ec.id = e.categoria_id
    LEFT JOIN room_equipment re ON re.equipment_id = e.id
    LEFT JOIN event_rooms er ON er.id = re.room_id
    LEFT JOIN events ev ON ev.id = er.event_id
    GROUP BY e.id
    ORDER BY total_usos DESC
  `).all();

  res.json(rows);
});

// GET /api/stats/operators (admin only)
// For each personal user: id, nombre, apellido, total_eventos, ultimo_evento
router.get('/operators', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      COUNT(DISTINCT er.event_id) AS total_eventos,
      MAX(ev.fecha_inicio) AS ultimo_evento
    FROM users u
    LEFT JOIN room_staff rs ON rs.user_id = u.id
    LEFT JOIN event_rooms er ON er.id = rs.room_id
    LEFT JOIN events ev ON ev.id = er.event_id
    WHERE u.role = 'personal'
    GROUP BY u.id
    ORDER BY total_eventos DESC
  `).all();

  res.json(rows);
});

module.exports = router;
