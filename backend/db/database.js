const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'congress_cctv.db');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ Connected to SQLite database');

// Migrations
try { db.exec('ALTER TABLE events ADD COLUMN hora_ingreso TEXT'); } catch {}
try { db.exec('ALTER TABLE events ADD COLUMN color TEXT'); } catch {}

// Equipment checkout migrations
try { db.exec("ALTER TABLE room_equipment ADD COLUMN checkout_status TEXT DEFAULT 'pendiente'"); } catch {}
try { db.exec('ALTER TABLE room_equipment ADD COLUMN fecha_entrega TEXT'); } catch {}
try { db.exec('ALTER TABLE room_equipment ADD COLUMN fecha_devolucion TEXT'); } catch {}

// User email migration
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}

// User avatar migration
try { db.exec('ALTER TABLE users ADD COLUMN avatar TEXT'); } catch {}

// Equipment destination on report
try { db.exec('ALTER TABLE reports ADD COLUMN destino_equipos TEXT'); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    telefono TEXT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'personal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    categoria_id INTEGER REFERENCES equipment_categories(id),
    estado TEXT DEFAULT 'disponible',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_orden TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    cliente TEXT,
    ubicacion TEXT,
    fecha_armado DATE,
    fecha_inicio DATE NOT NULL,
    fecha_finalizacion DATE NOT NULL,
    estado TEXT DEFAULT 'a_confirmar',
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS room_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES event_rooms(id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    cantidad INTEGER DEFAULT 1,
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS room_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES event_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    puesto TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    encargado_id INTEGER REFERENCES users(id),
    salio_segun_plan INTEGER DEFAULT 1,
    problemas_tecnicos INTEGER DEFAULT 0,
    descripcion_problemas TEXT,
    calidad_streaming TEXT,
    personal_suficiente INTEGER DEFAULT 1,
    equipo_completo INTEGER DEFAULT 1,
    equipos_con_fallas TEXT,
    recomendaciones TEXT,
    nota_general INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tutorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    caption TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed admin user
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (nombre, apellido, username, password, role) VALUES (?, ?, ?, ?, ?)`).run('Admin', 'Congress', 'admin', hash, 'admin');
  console.log('✅ Admin user created: admin / admin123');
}

// Seed categories
const cats = ['Cámaras', 'Grabación', 'Streaming / vMix', 'Audio', 'Iluminación', 'Accesorios', 'Cables y Conectores', 'Otros'];
const insertCat = db.prepare('INSERT OR IGNORE INTO equipment_categories (nombre) VALUES (?)');
cats.forEach(c => insertCat.run(c));

console.log('✅ Database initialized');

module.exports = db;
