const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET all users (admin only)
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, nombre, apellido, telefono, username, role, created_at FROM users ORDER BY apellido').all();
  res.json(users);
});

// POST create user (admin only)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { nombre, apellido, telefono, username, password, role } = req.body;
  if (!nombre || !apellido || !username || !password)
    return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, username, password' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (nombre, apellido, telefono, username, password, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(nombre, apellido, telefono || null, username, hash, role || 'personal');

  res.status(201).json({ id: result.lastInsertRowid, nombre, apellido, username, role: role || 'personal' });
});

// PUT update user (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { nombre, apellido, telefono, role, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET nombre=?, apellido=?, telefono=?, role=?, password=? WHERE id=?')
      .run(nombre, apellido, telefono || null, role, hash, req.params.id);
  } else {
    db.prepare('UPDATE users SET nombre=?, apellido=?, telefono=?, role=? WHERE id=?')
      .run(nombre, apellido, telefono || null, role, req.params.id);
  }
  res.json({ success: true });
});

// GET user event history (admin only)
router.get('/:id/history', authMiddleware, adminOnly, (req, res) => {
  const history = db.prepare(`
    SELECT DISTINCT e.id, e.nombre, e.cliente, e.ubicacion, e.fecha_inicio, e.fecha_finalizacion, e.estado, e.color,
           rs.puesto, er.nombre as sala
    FROM room_staff rs
    JOIN event_rooms er ON er.id = rs.room_id
    JOIN events e ON e.id = er.event_id
    WHERE rs.user_id = ?
    ORDER BY e.fecha_inicio DESC
  `).all(req.params.id);
  res.json(history);
});

// DELETE user (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.username === 'admin') return res.status(403).json({ error: 'No se puede eliminar el admin principal' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
