import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName);
        if (result.requiresEmailConfirmation) {
          setMode('signin');
          setNotice('Account created — check your email to confirm it before signing in.');
          return;
        }
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // On success the browser navigates away to Google, so nothing more to do here.
  }

  return (
    <div className="admin-app login-page">
      <header className="login-page__topbar">
        <div className="login-page__brand">
          <img src="/Dental_logo_transparent.png" alt="" className="login-page__brand-icon" />
          <div>
            <span className="login-page__brand-name">
              Dr. Kusum's Dental <em>Care</em>
            </span>
            <span className="login-page__brand-sub">Admin Console</span>
          </div>
        </div>
      </header>

      <div className="login-page__body">
        <div className="card login-card">
          <h1 className="login-card__title">{mode === 'signup' ? 'Create account' : 'Clinical Workspace'}</h1>
          <p className="login-card__subtitle">
            {mode === 'signup'
              ? 'Register a staff account. An existing admin must grant dashboard access afterward.'
              : 'Enter authorized practitioner or administrator credentials.'}
          </p>

          {notice && <p className="login-card__notice">{notice}</p>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label className="login-card__label">
                  Full name
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Jane Doe"
                    required
                  />
                </label>
                <div style={{ height: 14 }} />
              </>
            )}
            <label className="login-card__label">
              Staff email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.kusum@example.com"
                required
              />
            </label>
            <div style={{ height: 14 }} />
            <label className="login-card__label">
              Password
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                required
              />
            </label>

            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}

            <div style={{ height: 18 }} />
            <button type="submit" disabled={loading || googleLoading} style={{ width: '100%' }}>
              {loading && <span className="spinner spinner--inline" aria-hidden="true" />}
              {loading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create account →' : 'Access clinical workspace →')}
            </button>
          </form>

          <p className="login-card__switch">
            {mode === 'signup' ? (
              <>Already have an account? <button type="button" className="link-action" onClick={() => switchMode('signin')}>Sign in</button></>
            ) : (
              <>Need an account? <button type="button" className="link-action" onClick={() => switchMode('signup')}>Sign up</button></>
            )}
          </p>

          <div className="login-card__divider"><span>or</span></div>

          <button
            type="button"
            className="secondary login-card__google-btn"
            disabled={loading || googleLoading}
            onClick={handleGoogleLogin}
            style={{ width: '100%' }}
          >
            {googleLoading ? (
              <span className="spinner spinner--inline" aria-hidden="true" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3.01-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
            )}
            {googleLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>

        <p className="login-page__footnote">
          Need access or IT assistance? Call <a href="tel:+918431907976">+91 84319 07976</a>
        </p>
      </div>

      <footer className="login-page__footer">
        <span>Authorized clinic personnel only</span>
        <span>© {new Date().getFullYear()} Dr. Kusum's Dental Care</span>
      </footer>
    </div>
  );
}
