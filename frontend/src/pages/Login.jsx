import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cctv, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.username, form.password);
    if (!result.success) setError(result.error);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.3,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: 'var(--shadow-accent)',
          }}>
            <Cctv size={28} color="var(--accent)" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.03em' }}>
            Congress CCTV
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
            Gestión de eventos y transmisiones en vivo
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                type="text"
                placeholder="Ingresá tu usuario"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Ingresá tu contraseña"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid rgba(255,71,87,0.25)',
                borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--red)', fontSize: '0.85rem'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: 4, padding: '12px' }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
