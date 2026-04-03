import React, { useState } from 'react';

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
    title: 'Cronograma Inteligente',
    desc: 'Calcule automaticamente as datas das aulas com base no dia de início, dias da semana e feriados.'
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6l-.8.6V18H9v-2.4l-.8-.6A7 7 0 0 1 12 2z"/>
        <path d="M9 21h6"/>
      </svg>
    ),
    title: 'IA com Gemini + Claude',
    desc: 'Chat com Gemini em streaming e sugestões pedagógicas do Claude com aprovação antes de salvar.'
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
    title: 'Galeria Pública',
    desc: 'Explore cronogramas de outros professores e adapte para sua turma com um clique.'
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: 'Importar Excel',
    desc: 'Importe seus cronogramas existentes em formato .xlsx e converta automaticamente para cards.'
  }
];

export default function LandingPage({ onSignIn, onSignUp }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (authMode === 'login') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password, name);
      }
    } catch (err) {
      setError(err.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent-i), var(--accent-a))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Cronograma FIEC</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setAuthMode('login'); setShowAuth(true); }}
          >
            Entrar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setAuthMode('register'); setShowAuth(true); }}
          >
            Criar conta
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '80px 32px',
        textAlign: 'center',
        maxWidth: 720, margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--accent-i)15',
          border: '1px solid var(--accent-i)33',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 600, color: 'var(--accent-i)',
          marginBottom: 24
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-i)' }} />
          FIEC — Fundação Instituto de Educação e Cultura
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 52px)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--text) 0%, var(--accent-i) 50%, var(--accent-a) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Organize suas aulas com inteligência
        </h1>

        <p style={{
          fontSize: 17, color: 'var(--text-muted)',
          lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px'
        }}>
          Cronograma automático, IA integrada com Gemini e Claude, importação de Excel e galeria pública para professores do FIEC.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => { setAuthMode('register'); setShowAuth(true); }}
            style={{ fontSize: 15, padding: '10px 24px' }}
          >
            Começar grátis
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setAuthMode('login'); setShowAuth(true); }}
            style={{ fontSize: 15, padding: '10px 24px' }}
          >
            Já tenho conta
          </button>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '40px 32px 80px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 18px'
            }}>
              <div style={{ color: 'var(--accent-i)', marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: 12, color: 'var(--text-muted)'
      }}>
        Cronograma FIEC — Feito com carinho para professores
      </footer>

      {/* Modal de auth */}
      {showAuth && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowAuth(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {authMode === 'login' ? 'Entrar' : 'Criar conta'}
              </h3>
              <button
                onClick={() => setShowAuth(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
                    Nome
                  </label>
                  <input
                    className="inp"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Email
                </label>
                <input
                  className="inp"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Senha
                </label>
                <input
                  className="inp"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div style={{
                  background: 'var(--red)15', border: '1px solid var(--red)33',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 13, color: 'var(--red)'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                {loading ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            <div style={{ position: 'relative', margin: '16px 0', textAlign: 'center' }}>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <span style={{
                position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--surface)', padding: '0 10px',
                fontSize: 12, color: 'var(--text-muted)'
              }}>ou</span>
            </div>

            <button className="btn btn-google" onClick={() => { /* Google OAuth */ }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
              {authMode === 'login' ? (
                <>Não tem conta? <button onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: 'var(--accent-i)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Criar agora</button></>
              ) : (
                <>Já tem conta? <button onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent-i)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Entrar</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
