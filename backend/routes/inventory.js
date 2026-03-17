const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET all categories
router.get('/categories', authMiddleware, (req, res) => {
  const cats = db.prepare('SELECT * FROM equipment_categories ORDER BY nombre').all();
  res.json(cats);
});

// POST create category (admin only)
router.post('/categories', authMiddleware, adminOnly, (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const result = db.prepare('INSERT INTO equipment_categories (nombre) VALUES (?)').run(nombre);
  res.status(201).json({ id: result.lastInsertRowid, nombre });
});

// DELETE category
router.delete('/categories/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM equipment_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET all equipment (with category info)
router.get('/', authMiddleware, (req, res) => {
  const equipment = db.prepare(`
    SELECT e.*, ec.nombre as categoria_nombre
    FROM equipment e
    LEFT JOIN equipment_categories ec ON ec.id = e.categoria_id
    ORDER BY ec.nombre, e.nombre
  `).all();
  res.json(equipment);
});

// POST create equipment (admin only)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { nombre, descripcion, marca, modelo, numero_serie, categoria_id, estado } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const result = db.prepare(`
    INSERT INTO equipment (nombre, descripcion, marca, modelo, numero_serie, categoria_id, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, descripcion || null, marca || null, modelo || null, numero_serie || null, categoria_id || null, estado || 'disponible');

  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

// PUT update equipment (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { nombre, descripcion, marca, modelo, numero_serie, categoria_id, estado } = req.body;
  db.prepare(`
    UPDATE equipment SET nombre=?, descripcion=?, marca=?, modelo=?, numero_serie=?, categoria_id=?, estado=? WHERE id=?
  `).run(nombre, descripcion || null, marca || null, modelo || null, numero_serie || null, categoria_id || null, estado || 'disponible', req.params.id);
  res.json({ success: true });
});

// DELETE equipment (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
