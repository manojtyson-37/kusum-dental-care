import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { oauthSession } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';

// Landing point for Supabase's Google OAuth redirect. Exchanges the ?code=
// PKCE param for a Supabase session, hands the tokens to our backend to
// resolve role the same way password login does, then joins that result
// into our own session store via acceptSession — from here on the app
// can't tell this apart from a password login.
export default function AuthCallback() {
  const navigate = useNavigate();
  const { acceptSession } = useAuth();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlError = searchParams.get('error_description') || searchParams.get('error');
        if (urlError) {
          throw new Error(urlError);
        }

        // Try getting existing session from supabase client
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData?.session;

        // If not already resolved, exchange code for session
        if (!session) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) {
            throw new Error(exchangeError?.message || 'Google sign-in failed');
          }
          session = data?.session;
        }

        if (!session?.access_token) {
          throw new Error('No authentication session found.');
        }

        const result = await oauthSession(session.access_token, session.refresh_token);
        acceptSession(result);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [acceptSession, navigate]);

  if (error) {
    return (
      <div className="admin-app login-page">
        <div className="login-page__body">
          <div className="card login-card">
            <h1 className="login-card__title">Sign-in failed</h1>
            <p className="error-text" role="alert">{error}</p>
            <div style={{ height: 18 }} />
            <button type="button" style={{ width: '100%' }} onClick={() => navigate('/login', { replace: true })}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Spinner label="Signing in…" />;
}
