const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'tutorials');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.pdf');
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET all tutorials
router.get('/', authMiddleware, (req, res) => {
  const tutorials = db.prepare('SELECT * FROM tutorials ORDER BY created_at DESC').all();
  res.json(tutorials);
});

// GET single tutorial file (stream PDF) — accepts token as query param for iframe embed
router.get('/:id/file', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { jwt.verify(token, process.env.JWT_SECRET || 'congress_cctv_secret_2024'); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }

  const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
  if (!tutorial) return res.status(404).json({ error: 'Tutorial no encontrado' });

  const filePath = path.join(UPLOAD_DIR, tutorial.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${tutorial.original_name}"`);
  fs.createReadStream(filePath).pipe(res);
});

// POST upload tutorial (admin only)
router.post('/', authMiddleware, adminOnly, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo PDF requerido' });
  const { titulo, descripcion, categoria } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título requerido' });

  const result = db.prepare(`
    INSERT INTO tutorials (titulo, descripcion, categoria, filename, original_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(titulo, descripcion || null, categoria || null, req.file.filename, req.file.originalname);

  res.status(201).json({ id: result.lastInsertRowid, titulo, descripcion, categoria, filename: req.file.filename });
});

// DELETE tutorial (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
  if (!tutorial) return res.status(404).json({ error: 'Tutorial no encontrado' });

  const filePath = path.join(UPLOAD_DIR, tutorial.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM tutorials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
