const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Avatar upload setup
const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => cb(null, `user_${req.params.id}${path.extname(file.originalname).toLowerCase() || '.jpg'}`)
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo JPG, PNG o WEBP'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET avatar file (authenticated via header or query param)
router.get('/:id/avatar', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { jwt.verify(token, process.env.JWT_SECRET || 'congress_cctv_secret_2024'); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
  const user = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.params.id);
  if (!user?.avatar) return res.status(404).json({ error: 'Sin avatar' });
  const filePath = path.join(AVATARS_DIR, user.avatar);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  const ext = path.extname(user.avatar).toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(filePath).pipe(res);
});

// POST upload avatar (admin only)
router.post('/:id/avatar', authMiddleware, adminOnly, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });
  const filename = req.file.filename;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(filename, req.params.id);
  res.json({ success: true, avatar: filename });
});

// DELETE avatar (admin only)
router.delete('/:id/avatar', authMiddleware, adminOnly, (req, res) => {
  const user = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.params.id);
  if (user?.avatar) {
    const filePath = path.join(AVATARS_DIR, user.avatar);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

// GET all users (admin only)
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, nombre, apellido, telefono, email, username, role, avatar, created_at FROM users ORDER BY apellido').all();
  res.json(users);
});

// POST create user (admin only)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { nombre, apellido, telefono, email, username, password, role } = req.body;
  if (!nombre || !apellido || !username || !password)
    return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, username, password' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (nombre, apellido, telefono, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(nombre, apellido, telefono || null, email || null, username, hash, role || 'personal');

  res.status(201).json({ id: result.lastInsertRowid, nombre, apellido, username, role: role || 'personal' });
});

// PUT update user (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { nombre, apellido, telefono, email, role, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET nombre=?, apellido=?, telefono=?, email=?, role=?, password=? WHERE id=?')
      .run(nombre, apellido, telefono || null, email || null, role, hash, req.params.id);
  } else {
    db.prepare('UPDATE users SET nombre=?, apellido=?, telefono=?, email=?, role=? WHERE id=?')
      .run(nombre, apellido, telefono || null, email || null, role, req.params.id);
  }
  res.json({ success: true });
});

// GET user event history (admin only)
router.get('/:id/history', authMiddleware, adminOnly, (req, res) => {
  const history = db.prepare(`
    SELECT rs.id as assignment_id, e.id, e.nombre, e.ubicacion, e.fecha_inicio, e.fecha_finalizacion, e.estado, e.color,
           rs.puesto, er.nombre as sala
    FROM room_staff rs
    JOIN event_rooms er ON er.id = rs.room_id
    JOIN events e ON e.id = er.event_id
    WHERE rs.user_id = ?
    ORDER BY e.fecha_inicio DESC
  `).all(req.params.id);
  res.json(history);
});

// DELETE history entry (admin only)
router.delete('/history/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM room_staff WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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
