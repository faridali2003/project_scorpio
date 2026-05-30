import React, { useState, useCallback, useEffect } from 'react';
import './SteamStyle.css';
import Dashboard from './Dashboard';
import SpeedrunShooter from './games/speedrun-shooter/SpeedrunShooter';
import SoccerGame from './games/soccer/SoccerGame';
import ScorpioAuthPage from './components/ScorpioAuthPage';
import { SCORPIO_SHOOTER_ID, SCORPIO_SOCCER_ID } from './data/games';

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
            <ScorpioAuthPage onLoginSuccess={handleLoginSuccess} addToast={addToast} />
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
