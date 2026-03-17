import { useState, useEffect } from 'react';
import { getTutorials, uploadTutorial, deleteTutorial, getTutorialFileUrl } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Upload, Trash2, Search, X, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CATS = ['Cámaras', 'vMix / Streaming', 'Grabación', 'Audio', 'Iluminación', 'Accesorios', 'Otros'];

export default function Tutorials() {
  const { isAdmin } = useAuth();
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', categoria: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    getTutorials().then(r => setTutorials(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Seleccioná un archivo PDF');
    setSaving(true);
    const fd = new FormData();
    fd.append('pdf', file);
    fd.append('titulo', form.titulo);
    fd.append('descripcion', form.descripcion);
    fd.append('categoria', form.categoria);
    try {
      await uploadTutorial(fd);
      toast.success('Tutorial subido');
      setShowUpload(false);
      setForm({ titulo: '', descripcion: '', categoria: '' });
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, titulo) => {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return;
    try { await deleteTutorial(id); toast.success('Tutorial eliminado'); load(); }
    catch { toast.error('Error al eliminar'); }
  };

  const filtered = tutorials.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.titulo.toLowerCase().includes(q) || (t.descripcion || '').toLowerCase().includes(q) || (t.categoria || '').toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || t.categoria === catFilter;
    return matchSearch && matchCat;
  });

  const allCats = [...new Set(tutorials.map(t => t.categoria).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tutoriales</h1>
          <p className="page-subtitle">{tutorials.length} documento{tutorials.length !== 1 ? 's' : ''} disponibles</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={15} /> Subir tutorial
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input placeholder="Buscar tutoriales..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}><span className="spinner" style={{ display: 'inline-block', width: 32, height: 32 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state"><BookOpen size={40} style={{ margin: '0 auto 12px', display: 'block' }} /><p>Sin tutoriales{search ? ' que coincidan' : ''}.</p></div>
      ) : (
        <div className="grid-3">
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* PDF icon */}
              <div style={{
                width: '100%', height: 100, background: 'var(--bg-elevated)',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14, border: '1px solid var(--border)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', lineHeight: 1 }}>📄</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red)', marginTop: 4, letterSpacing: '0.1em' }}>PDF</div>
                </div>
              </div>

              {/* Category badge */}
              {t.categoria && (
                <span className="badge badge-admin" style={{ marginBottom: 8, fontSize: '0.67rem' }}>{t.categoria}</span>
              )}

              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6, lineHeight: 1.3 }}>
                {t.titulo}
              </div>
              {t.descripcion && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{t.descripcion}</p>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                {format(parseISO(t.created_at), "d MMM yyyy", { locale: es })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setViewingPdf(t)}
                >
                  Ver PDF
                </button>
                <a
                  href={getTutorialFileUrl(t.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon"
                  title="Abrir en nueva pestaña"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
                {isAdmin && (
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--red)' }}
                    onClick={e => { e.stopPropagation(); handleDelete(t.id, t.titulo); }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Subir tutorial</h2>
              <button className="btn-icon" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Archivo PDF *</label>
                  <div style={{
                    border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: '20px',
                    textAlign: 'center', cursor: 'pointer', background: file ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    transition: 'all 0.15s',
                  }}>
                    <input type="file" accept=".pdf" style={{ display: 'none' }} id="pdf-upload" onChange={e => setFile(e.target.files[0])} />
                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                      {file ? (
                        <div>
                          <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>📄 {file.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      ) : (
                        <div>
                          <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.87rem' }}>Hacé click para seleccionar un PDF</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Máximo 50MB</div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-control" required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Nombre del tutorial" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-control" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-control" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Breve descripción del contenido..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowUpload(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Upload size={14} /> Subir</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer modal */}
      {viewingPdf && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewingPdf(null)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', width: '95vw', height: '92vh',
            maxWidth: 1000, display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{viewingPdf.titulo}</div>
                {viewingPdf.descripcion && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{viewingPdf.descripcion}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={getTutorialFileUrl(viewingPdf.id)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  <ExternalLink size={13} /> Abrir en nueva pestaña
                </a>
                <button className="btn-icon" onClick={() => setViewingPdf(null)}><X size={16} /></button>
              </div>
            </div>
            <iframe
              src={getTutorialFileUrl(viewingPdf.id)}
              style={{ flex: 1, border: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}
              title={viewingPdf.titulo}
            />
          </div>
        </div>
      )}
    </div>
  );
}
