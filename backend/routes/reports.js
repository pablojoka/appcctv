const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET all reports (admin only)
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, e.nombre as evento_nombre, e.numero_orden, e.fecha_inicio,
           u.nombre as encargado_nombre, u.apellido as encargado_apellido
    FROM reports r
    JOIN events e ON e.id = r.event_id
    LEFT JOIN users u ON u.id = r.encargado_id
    ORDER BY r.created_at DESC
  `).all();
  res.json(reports);
});

// GET single report
router.get('/:eventId', authMiddleware, (req, res) => {
  const report = db.prepare(`
    SELECT r.*, e.nombre as evento_nombre, e.numero_orden, e.fecha_inicio, e.ubicacion,
           u.nombre as encargado_nombre, u.apellido as encargado_apellido
    FROM reports r
    JOIN events e ON e.id = r.event_id
    LEFT JOIN users u ON u.id = r.encargado_id
    WHERE r.event_id = ?
  `).get(req.params.eventId);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(report);
});

// POST create report and close event (admin or assigned staff)
router.post('/', authMiddleware, (req, res) => {
  const {
    event_id,
    salio_segun_plan,
    problemas_tecnicos,
    descripcion_problemas,
    calidad_streaming,
    personal_suficiente,
    equipo_completo,
    equipos_con_fallas,
    recomendaciones,
    nota_general
  } = req.body;

  if (!event_id) return res.status(400).json({ error: 'event_id requerido' });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const existing = db.prepare('SELECT id FROM reports WHERE event_id = ?').get(event_id);
  if (existing) return res.status(409).json({ error: 'Ya existe un reporte para este evento' });

  const result = db.prepare(`
    INSERT INTO reports (event_id, encargado_id, salio_segun_plan, problemas_tecnicos, descripcion_problemas,
      calidad_streaming, personal_suficiente, equipo_completo, equipos_con_fallas, recomendaciones, nota_general)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(event_id, req.user.id, salio_segun_plan ? 1 : 0, problemas_tecnicos ? 1 : 0,
    descripcion_problemas || null, calidad_streaming || null,
    personal_suficiente ? 1 : 0, equipo_completo ? 1 : 0,
    equipos_con_fallas || null, recomendaciones || null, nota_general || null);

  // Close the event
  db.prepare("UPDATE events SET estado = 'finalizado' WHERE id = ?").run(event_id);

  res.status(201).json({ id: result.lastInsertRowid, success: true });
});

// PUT update report (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const {
    salio_segun_plan, problemas_tecnicos, descripcion_problemas,
    calidad_streaming, personal_suficiente, equipo_completo,
    equipos_con_fallas, recomendaciones, nota_general
  } = req.body;

  db.prepare(`
    UPDATE reports SET salio_segun_plan=?, problemas_tecnicos=?, descripcion_problemas=?,
    calidad_streaming=?, personal_suficiente=?, equipo_completo=?, equipos_con_fallas=?,
    recomendaciones=?, nota_general=? WHERE id=?
  `).run(salio_segun_plan ? 1 : 0, problemas_tecnicos ? 1 : 0, descripcion_problemas || null,
    calidad_streaming || null, personal_suficiente ? 1 : 0, equipo_completo ? 1 : 0,
    equipos_con_fallas || null, recomendaciones || null, nota_general || null, req.params.id);

  res.json({ success: true });
});

module.exports = router;
