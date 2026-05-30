import React, { useState, useCallback, useEffect } from 'react';
import './SteamStyle.css';
import Dashboard from './Dashboard';
import SpeedrunShooter from './games/speedrun-shooter/SpeedrunShooter';
import SoccerGame from './games/soccer/SoccerGame';
import { SCORPIO_SHOOTER_ID, SCORPIO_SOCCER_ID } from './data/games';
import { BASE } from './api/client';

const urlParams = new URLSearchParams(window.location.search);
/** Dev preview: ?arena=1 · ?play=speedrun-shooter · ?play=scorpio-soccer */
const ARENA_PREVIEW =
  urlParams.get('arena') === '1' || urlParams.get('play') === SCORPIO_SHOOTER_ID;
const SOCCER_PREVIEW = urlParams.get('play') === SCORPIO_SOCCER_ID;

// ─── TOAST CONTEXT ─────────────────────────────────────────────────────────────
export const ToastContext = React.createContext(null);
export const UserContext = React.createContext(null);

// ─── TOAST MANAGER ─────────────────────────────────────────────────────────────
function ToastManager({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.icon}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >×</button>
        </div>
      ))}
    </div>
  );
}

// ─── PANDA COMPONENT ───────────────────────────────────────────────────────────
const Panda = ({ covering, lookAngle }) => (
  <div className={`panda-container ${covering ? 'covering-eyes' : ''}`}>
    <div className="panda-ear ear-left" />
    <div className="panda-ear ear-right" />
    <div className="panda-face">
      <div className="panda-eye eye-left">
        <div className="panda-pupil" style={{ transform: `translateX(${lookAngle}px) translateY(1px)` }} />
      </div>
      <div className="panda-eye eye-right">
        <div className="panda-pupil" style={{ transform: `translateX(${lookAngle}px) translateY(1px)` }} />
      </div>
    </div>
    <div className="panda-hand hand-left" />
    <div className="panda-hand hand-right" />
  </div>
);

// ─── AUTH FORM ─────────────────────────────────────────────────────────────────
function LandingPage({ onLoginSuccess, addToast }) {
  const [mode, setMode] = useState('login');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [lookAngle, setLookAngle] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', username: '', securityAnswer: '', newPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleLook = (e) => {
    const len = e.target.value.length;
    setLookAngle(Math.min(Math.max((len / 3) - 5, -5), 5));
  };

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Email is required';
    if (mode !== 'reset' && !formData.password) errs.password = 'Password is required';
    if (mode === 'register' && !formData.username) errs.username = 'Username is required';
    if (mode === 'register' && formData.password.length < 6) errs.password = 'Min 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const endpoint = mode === 'reset' ? 'reset-password' : mode;
    try {
      const body = mode === 'reset'
        ? { email: formData.email, securityAnswer: formData.securityAnswer, newPassword: formData.newPassword }
        : mode === 'register'
        ? { username: formData.username, email: formData.email, password: formData.password, securityAnswer: formData.securityAnswer }
        : { email: formData.email, password: formData.password };

      const response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === 'login' || mode === 'register') {
          localStorage.setItem('scorpio_token', data.token);
          localStorage.setItem('scorpio_user', JSON.stringify(data));
          onLoginSuccess(data);
        } else {
          addToast('Password reset successfully!', 'success', '🔒');
          setMode('login');
        }
      } else {
        addToast(data.error || 'Something went wrong.', 'error', '⚠️');
      }
    } catch {
      addToast('Cannot connect to server. Is the backend running?', 'error', '🔌');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setIsPasswordFocused(false); setErrors({}); };

  return (
    <div className="auth-page">
      <div className="auth-showcase">
        <div className="auth-showcase-title">Scorpio v3</div>
        <p>
          A premium-style gaming hub for your portfolio. Local accounts, store, library,
          friends, and chat — completely separate from the real Steam client.
        </p>
        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Demo gift codes: WELCOME50 · SCORPIO100 · DEMO25 · GAMER75
        </p>
      </div>
      <div className="auth-card">
        <div className="auth-logo">SCORPIO</div>
        <div className="auth-subtitle">Your Gaming Universe</div>

        <Panda covering={isPasswordFocused} lookAngle={lookAngle} />

        <div className="auth-mode-title">
          {mode === 'login' && 'Sign In'}
          {mode === 'register' && 'Create Account'}
          {mode === 'reset' && 'Reset Password'}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              className={`steam-input${errors.email ? ' error' : ''}`}
              type="email"
              placeholder="Email address"
              value={formData.email}
              onFocus={() => setIsPasswordFocused(false)}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); handleLook(e); }}
            />
            {errors.email && <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.email}</div>}
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <input
                className={`steam-input${errors.username ? ' error' : ''}`}
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onFocus={() => setIsPasswordFocused(false)}
                onChange={(e) => { setFormData({ ...formData, username: e.target.value }); handleLook(e); }}
              />
              {errors.username && <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.username}</div>}
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <input
                className={`steam-input${errors.password ? ' error' : ''}`}
                type="password"
                placeholder="Password"
                value={formData.password}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {errors.password && <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.password}</div>}
            </div>
          )}

          {(mode === 'register' || mode === 'reset') && (
            <div className="form-group">
              <input
                className="steam-input"
                type="text"
                placeholder="Security Question: Your first pet's name?"
                value={formData.securityAnswer}
                onFocus={() => setIsPasswordFocused(false)}
                onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
              />
            </div>
          )}

          {mode === 'reset' && (
            <div className="form-group">
              <input
                className="steam-input"
                type="password"
                placeholder="New password"
                value={formData.newPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
          {mode === 'login' ? (
            <>
              <span
                onClick={() => switchMode('register')}
                style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}
              >Create a new account</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>·</span>
              <span
                onClick={() => switchMode('reset')}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
              >Forgot password?</span>
            </>
          ) : (
            <span
              onClick={() => switchMode('login')}
              style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}
            >← Back to sign in</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
function normalizeSessionUser(data) {
  return {
    ...data,
    id: Number(data.id),
    balance: data.balance != null ? parseFloat(data.balance) : 0,
  };
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('scorpio_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('scorpio_user');
      return saved ? (JSON.parse(saved).theme || 'dark') : 'dark';
    } catch { return 'dark'; }
  });

  const [playingGameId, setPlayingGameId] = useState(() => {
    if (SOCCER_PREVIEW) return SCORPIO_SOCCER_ID;
    if (ARENA_PREVIEW) return SCORPIO_SHOOTER_ID;
    return null;
  });

  const exitGame = useCallback(() => {
    setPlayingGameId(null);
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const addToast = useCallback((message, type = 'info', icon = 'ℹ️') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setPlayingGameId(null);
      addToast('Session expired — please sign in again.', 'info', '🔑');
    };
    window.addEventListener('scorpio:session-expired', onExpired);
    return () => window.removeEventListener('scorpio:session-expired', onExpired);
  }, [addToast]);

  const handleLoginSuccess = (data) => {
    const session = normalizeSessionUser(data);
    if (data.token) localStorage.setItem('scorpio_token', data.token);
    localStorage.setItem('scorpio_user', JSON.stringify(session));
    setUser(session);
    setTheme(session.theme || 'dark');
    addToast(`Welcome, ${session.username}!`, 'success', 'OK');
  };

  const handleLogout = () => {
    localStorage.removeItem('scorpio_token');
    localStorage.removeItem('scorpio_user');
    setUser(null);
    setPlayingGameId(null);
    addToast('Logged out. See you soon!', 'info', '👋');
  };

  const syncUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ...patch,
        id: patch.id != null ? Number(patch.id) : Number(prev.id),
        balance: patch.balance != null ? patch.balance : prev.balance,
      };
      localStorage.setItem('scorpio_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    setUser(prev => ({ ...prev, theme: newTheme }));
    localStorage.setItem('scorpio_user', JSON.stringify({ ...user, theme: newTheme }));
  };

  if (playingGameId === SCORPIO_SHOOTER_ID) {
    return <SpeedrunShooter onExit={exitGame} />;
  }

  if (playingGameId === SCORPIO_SOCCER_ID) {
    return <SoccerGame onExit={exitGame} />;
  }

  return (
    <ToastContext.Provider value={addToast}>
      <UserContext.Provider value={{ user, setUser }}>
        <div className="App" data-theme={theme}>
          {!user ? (
            <LandingPage onLoginSuccess={handleLoginSuccess} addToast={addToast} />
          ) : (
            <Dashboard
              user={user}
              theme={theme}
              updateTheme={updateTheme}
              onLogout={handleLogout}
              addToast={addToast}
              onUserSync={syncUser}
              onPlayGame={setPlayingGameId}
            />
          )}
          <ToastManager toasts={toasts} removeToast={removeToast} />
        </div>
      </UserContext.Provider>
    </ToastContext.Provider>
  );
}

export default App;
