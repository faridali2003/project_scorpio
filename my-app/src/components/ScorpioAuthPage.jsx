import { useState, useCallback, useRef } from 'react';
import { BASE } from '../api/client';
import { playLoginSuccessSound } from '../utils/authSounds';
import AuthCharacters from './AuthCharacters';
import './auth-characters.css';

const EyeOpenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function focusPointFromInput(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.right - 30, y: rect.top + rect.height / 2 };
}

export default function ScorpioAuthPage({ onLoginSuccess, addToast }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeField, setActiveField] = useState('idle');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isTypingPassword, setIsTypingPassword] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [loginFailedKey, setLoginFailedKey] = useState(0);
  const [loginSuccessKey, setLoginSuccessKey] = useState(0);
  const typingTimerRef = useRef(null);
  const blurTimerRef = useRef(null);
  const failUntilMsRef = useRef(0);
  const successUntilMsRef = useRef(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    securityAnswer: '',
    newPassword: '',
  });
  const [errors, setErrors] = useState({});

  const activePasswordLength = mode === 'reset'
    ? formData.newPassword.length
    : formData.password.length;

  const activeShowPassword = mode === 'reset' ? showNewPassword : showPassword;

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
    setShowPassword(false);
    setShowNewPassword(false);
    setActiveField('idle');
    setPasswordFocused(false);
    setFocusPoint(null);
    setIsTypingPassword(false);
  };

  const triggerFailReaction = useCallback(() => {
    failUntilMsRef.current = performance.now() + 2600 + 1700;
    setLoginFailedKey((k) => k + 1);
  }, []);

  const triggerSuccessReaction = useCallback(() => {
    successUntilMsRef.current = performance.now() + 2600;
    setLoginSuccessKey((k) => k + 1);
  }, []);

  const pulsePasswordTyping = useCallback(() => {
    setIsTypingPassword(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTypingPassword(false), 850);
  }, []);

  const handleFieldFocus = useCallback((field, el) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setIsTypingPassword(false);
    setActiveField(field);
    if (field === 'password' || field === 'newPassword') {
      setPasswordFocused(true);
    } else {
      setPasswordFocused(false);
    }
    setFocusPoint(focusPointFromInput(el));
  }, []);

  const handleFieldBlur = useCallback((e) => {
    if (e?.relatedTarget?.classList?.contains('scorpio-auth__toggle-pass')) {
      return;
    }
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      const active = document.activeElement;
      if (active?.name === 'password' || active?.name === 'newPassword') return;
      if (active?.classList?.contains('scorpio-auth__toggle-pass')) return;
      setActiveField('idle');
      setPasswordFocused(false);
      setFocusPoint(null);
      setIsTypingPassword(false);
    }, 0);
  }, []);

  const togglePasswordVisibility = (field) => {
    const isPasswordField = field === 'password';
    const nextShow = isPasswordField ? !showPassword : !showNewPassword;

    if (isPasswordField) setShowPassword(nextShow);
    else setShowNewPassword(nextShow);

    const el = document.querySelector(`input[name="${field}"]`);
    setPasswordFocused(true);
    setActiveField(field === 'newPassword' ? 'newPassword' : 'password');
    if (el) setFocusPoint(focusPointFromInput(el));

    requestAnimationFrame(() => {
      el?.focus();
    });
  };

  const handlePasswordChange = (value, field) => {
    setPasswordFocused(true);
    setActiveField(field === 'newPassword' ? 'newPassword' : 'password');

    const el = document.querySelector(`input[name="${field}"]`);
    if (el) setFocusPoint(focusPointFromInput(el));

    const showing = field === 'newPassword' ? showNewPassword : showPassword;
    if (!showing && value.length > 0) {
      pulsePasswordTyping();
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = 'Email is required';
    if (mode !== 'reset' && !formData.password) errs.password = 'Password is required';
    if (mode === 'register' && !formData.username.trim()) errs.username = 'Username is required';
    if (mode === 'register' && formData.password.length < 6) errs.password = 'Min 6 characters';
    if (mode === 'reset' && !formData.newPassword) errs.newPassword = 'New password is required';
    if ((mode === 'register' || mode === 'reset') && !formData.securityAnswer.trim()) {
      errs.securityAnswer = 'Security answer is required';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      triggerFailReaction();
      const firstKey = Object.keys(errs)[0];
      const nameMap = {
        email: 'email',
        username: 'username',
        password: 'password',
        newPassword: 'newPassword',
        securityAnswer: 'securityAnswer',
      };
      const inputName = nameMap[firstKey];
      const el = inputName ? document.querySelector(`input[name="${inputName}"]`) : null;
      if (el) {
        setFocusPoint(focusPointFromInput(el));
        setActiveField(inputName === 'newPassword' ? 'newPassword' : inputName);
        if (inputName === 'password' || inputName === 'newPassword') setPasswordFocused(true);
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const endpoint = mode === 'reset' ? 'reset-password' : mode;

    try {
      const body = mode === 'reset'
        ? {
            email: formData.email,
            securityAnswer: formData.securityAnswer,
            newPassword: formData.newPassword,
          }
        : mode === 'register'
          ? {
              username: formData.username,
              email: formData.email,
              password: formData.password,
              securityAnswer: formData.securityAnswer,
            }
          : { email: formData.email, password: formData.password };

      const response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === 'login' || mode === 'register') {
          triggerSuccessReaction();
          playLoginSuccessSound();
          localStorage.setItem('scorpio_token', data.token);
          localStorage.setItem('scorpio_user', JSON.stringify(data));
          window.setTimeout(() => onLoginSuccess(data), 2500);
        } else {
          addToast('Password reset successfully!', 'success', '🔒');
          switchMode('login');
        }
      } else {
        addToast(data.error || 'Something went wrong.', 'error', '⚠️');
        triggerFailReaction();
        setPasswordFocused(true);
        setActiveField(mode === 'reset' ? 'newPassword' : 'password');
        const pwName = mode === 'reset' ? 'newPassword' : 'password';
        const pwEl = document.querySelector(`input[name="${pwName}"]`);
        if (pwEl) setFocusPoint(focusPointFromInput(pwEl));
      }
    } catch {
      addToast('Cannot connect to server. Is the backend running?', 'error', '🔌');
      triggerFailReaction();
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === 'login'
    ? 'Welcome back'
    : mode === 'register'
      ? 'Create your account'
      : 'Reset password';

  const subheading = mode === 'login'
    ? 'Sign in to your Scorpio library, store, and games.'
    : mode === 'register'
      ? 'Join the storefront demo — play Aim Lab and Soccer Stadium.'
      : 'Use your security answer to set a new password.';

  return (
    <div className="scorpio-auth">
      <aside className="scorpio-auth__characters-pane">
        <div className="scorpio-auth__brand">
          <div className="scorpio-auth__brand-mark">Project Scorpio</div>
          <h1 className="scorpio-auth__brand-title">Your gaming universe</h1>
          <p className="scorpio-auth__brand-desc">
            A premium-style portfolio storefront — local accounts, library, friends,
            chat, and two playable originals. Not connected to Steam.
          </p>
          <p className="scorpio-auth__brand-hint">
            Demo gift codes: WELCOME50 · SCORPIO100 · DEMO25 · GAMER75
          </p>
        </div>
        <div className="scorpio-auth__stage-wrap">
          <AuthCharacters
            activeField={activeField}
            passwordFocused={passwordFocused}
            isTypingPassword={isTypingPassword}
            showPassword={activeShowPassword}
            passwordLength={activePasswordLength}
            focusPoint={focusPoint}
            loginFailedKey={loginFailedKey}
            loginSuccessKey={loginSuccessKey}
            failUntilRef={failUntilMsRef}
            successUntilRef={successUntilMsRef}
          />
        </div>
      </aside>

      <main className="scorpio-auth__form-pane">
        <div className="scorpio-auth__form-card auth-card">
          <div className="scorpio-auth__form-icon" aria-hidden>✦</div>
          <h2 className="scorpio-auth__heading">{heading}</h2>
          <p className="scorpio-auth__subheading">{subheading}</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="scorpio-auth__field">
              <label htmlFor="scorpio-email">Email</label>
              <input
                id="scorpio-email"
                name="email"
                className={`steam-input${errors.email ? ' error' : ''}`}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onFocus={(e) => handleFieldFocus('email', e.target)}
                onBlur={handleFieldBlur}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (document.activeElement === e.target) {
                    setActiveField('email');
                    setFocusPoint(focusPointFromInput(e.target));
                  }
                }}
              />
              {errors.email && (
                <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.email}</div>
              )}
            </div>

            {mode === 'register' && (
              <div className="scorpio-auth__field">
                <label htmlFor="scorpio-username">Username</label>
                <input
                  id="scorpio-username"
                  name="username"
                  className={`steam-input${errors.username ? ' error' : ''}`}
                  type="text"
                  autoComplete="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onFocus={(e) => handleFieldFocus('username', e.target)}
                  onBlur={handleFieldBlur}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    if (document.activeElement === e.target) {
                      setActiveField('username');
                      setFocusPoint(focusPointFromInput(e.target));
                    }
                  }}
                />
                {errors.username && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.username}</div>
                )}
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="scorpio-auth__field">
                <label htmlFor="scorpio-password">Password</label>
                <div className="scorpio-auth__input-wrap">
                  <input
                    id="scorpio-password"
                    name="password"
                    className={`steam-input${errors.password ? ' error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onFocus={(e) => handleFieldFocus('password', e.target)}
                    onBlur={handleFieldBlur}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      handlePasswordChange(e.target.value, 'password');
                    }}
                  />
                  <button
                    type="button"
                    className="scorpio-auth__toggle-pass"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {errors.password && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.password}</div>
                )}
              </div>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <div className="scorpio-auth__field">
                <label htmlFor="scorpio-security">Security answer</label>
                <input
                  id="scorpio-security"
                  name="securityAnswer"
                  className={`steam-input${errors.securityAnswer ? ' error' : ''}`}
                  type="text"
                  autoComplete="off"
                  placeholder="Your first pet's name?"
                  value={formData.securityAnswer}
                  onFocus={(e) => handleFieldFocus('security', e.target)}
                  onBlur={handleFieldBlur}
                  onChange={(e) => {
                    setFormData({ ...formData, securityAnswer: e.target.value });
                    if (document.activeElement === e.target) {
                      setActiveField('security');
                      setFocusPoint(focusPointFromInput(e.target));
                    }
                  }}
                />
                {errors.securityAnswer && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.securityAnswer}</div>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div className="scorpio-auth__field">
                <label htmlFor="scorpio-new-password">New password</label>
                <div className="scorpio-auth__input-wrap">
                  <input
                    id="scorpio-new-password"
                    name="newPassword"
                    className={`steam-input${errors.newPassword ? ' error' : ''}`}
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.newPassword}
                    onFocus={(e) => handleFieldFocus('newPassword', e.target)}
                    onBlur={handleFieldBlur}
                    onChange={(e) => {
                      setFormData({ ...formData, newPassword: e.target.value });
                      handlePasswordChange(e.target.value, 'newPassword');
                    }}
                  />
                  <button
                    type="button"
                    className="scorpio-auth__toggle-pass"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => togglePasswordVisibility('newPassword')}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                </div>
                {errors.newPassword && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '11px', marginTop: '4px' }}>{errors.newPassword}</div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" /> : null}
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Reset password'}
            </button>
          </form>

          <div className="scorpio-auth__footer">
            {mode === 'login' ? (
              <>
                <button type="button" className="linkish" onClick={() => switchMode('register')}>
                  Create a new account
                </button>
                <span className="muted">·</span>
                <button type="button" className="linkish" onClick={() => switchMode('reset')} style={{ color: 'var(--text-muted)' }}>
                  Forgot password?
                </button>
              </>
            ) : (
              <button type="button" className="linkish" onClick={() => switchMode('login')}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
