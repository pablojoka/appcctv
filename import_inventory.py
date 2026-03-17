"""
Script de importación del inventario INVENTARIO_2026.xlsx
a la base de datos SQLite de Congress CCTV.

Uso:
  python import_inventory.py [ruta_al_xlsx] [ruta_a_la_db]

Defaults:
  xlsx: INVENTARIO_2026.xlsx (en el mismo directorio)
  db:   backend/data/congress_cctv.db
"""

import sys
import os
import sqlite3
import pandas as pd

# ── Rutas ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

XLSX_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SCRIPT_DIR, "INVENTARIO_2026.xlsx")
DB_PATH   = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SCRIPT_DIR, "backend", "data", "congress_cctv.db")

# ── Mapeo hoja → categoría ────────────────────────────────────────────────────
SHEET_TO_CATEGORY = {
    "CAMARAS":        "Cámaras",
    "CONTROLADOR":    "Controladores",
    "TRIPODES":       "Trípodes",
    "SWITCHERS":      "Switchers",
    "MONITORES":      "Monitores",
    "GRABADORAS":     "Grabadoras",
    "INTERCOMS":      "Intercoms",
    "INTERFACES":     "Interfaces",
    "SERVIDORES":     "Servidores",
    "SONIDO DIRECTO": "Sonido Directo",
    "LENTES":         "Lentes",
    "LUCES":          "Luces",
    "GRIPS":          "Grips",
    "ACCESORIOS CAM": "Accesorios Cam",
    "RACKS-BAULES":   "Racks y Baúles",
}

def clean(val):
    """Convierte NaN/None a None, y limpia strings."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ("nan", "none", "s/n") else None

def get_marca(row):
    """La columna MARCA puede llamarse 'MARCA', 'marca' o ' ' según la hoja."""
    for col in ["MARCA", "marca", " "]:
        if col in row.index:
            v = clean(row[col])
            if v:
                return v
    return None

def main():
    print(f"📂 Leyendo: {XLSX_PATH}")
    print(f"🗄️  Base de datos: {DB_PATH}")

    if not os.path.exists(XLSX_PATH):
        print(f"❌ No se encontró el archivo Excel: {XLSX_PATH}")
        sys.exit(1)
    if not os.path.exists(DB_PATH):
        print(f"❌ No se encontró la base de datos. Ejecutá el backend primero para inicializarla.")
        sys.exit(1)

    # ── Leer Excel ──────────────────────────────────────────────────────────────
    sheets = pd.read_excel(XLSX_PATH, sheet_name=None, dtype=str)
    print(f"✅ {len(sheets)} hojas encontradas: {list(sheets.keys())}")

    # ── Conectar a SQLite ───────────────────────────────────────────────────────
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # ── Obtener/crear categorías ────────────────────────────────────────────────
    def get_or_create_category(nombre):
        row = cur.execute("SELECT id FROM equipment_categories WHERE nombre = ?", (nombre,)).fetchone()
        if row:
            return row[0]
        cur.execute("INSERT INTO equipment_categories (nombre) VALUES (?)", (nombre,))
        return cur.lastrowid

    # ── Importar ────────────────────────────────────────────────────────────────
    total_inserted = 0
    total_skipped  = 0

    for sheet_name, df in sheets.items():
        cat_nombre = SHEET_TO_CATEGORY.get(sheet_name, "Otros")
        cat_id = get_or_create_category(cat_nombre)

        print(f"\n📋 Hoja: {sheet_name} → categoría: {cat_nombre} ({len(df)} filas)")

        for _, row in df.iterrows():
            nombre_raw = clean(row.get("Desc técnica")) or clean(row.get("Desc comercial"))
            if not nombre_raw:
                total_skipped += 1
                continue

            serie = clean(row.get("Nro de serie"))
            marca = get_marca(row)
            modelo = clean(row.get("Modelo"))
            subtipo = clean(row.get("Subtipo de equipo"))

            # Descripción = subtipo si aporta info extra
            descripcion = subtipo if subtipo and subtipo.upper() != nombre_raw.upper() else None

            # Verificar si ya existe (por número de serie único, si lo tiene)
            if serie:
                exists = cur.execute(
                    "SELECT id FROM equipment WHERE numero_serie = ?", (serie,)
                ).fetchone()
                if exists:
                    total_skipped += 1
                    continue

            cur.execute("""
                INSERT INTO equipment (nombre, descripcion, marca, modelo, numero_serie, categoria_id, estado)
                VALUES (?, ?, ?, ?, ?, ?, 'disponible')
            """, (nombre_raw, descripcion, marca, modelo, serie, cat_id))

            total_inserted += 1

    conn.commit()
    conn.close()

    print(f"\n{'='*50}")
    print(f"✅ Importación completada")
    print(f"   Equipos importados: {total_inserted}")
    print(f"   Filas omitidas (sin nombre o duplicadas): {total_skipped}")
    print(f"{'='*50}")
    print("\n💡 Podés verificar el inventario iniciando la app en http://localhost:5173/inventory")

if __name__ == "__main__":
    main()
