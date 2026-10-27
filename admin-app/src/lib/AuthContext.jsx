import { createContext, useContext, useState } from 'react';
import { getSession, setSession, login as apiLogin, register as apiRegister } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  // Written to localStorage synchronously, right here — not via a useEffect.
  // apiFetch() reads the token straight out of localStorage, and an effect
  // on `session` would run in child-before-parent order: a page that fires
  // its own data-fetch effect on mount (e.g. Dashboard, right after login
  // navigates to it) would read localStorage before this effect had a
  // chance to persist the just-set session, sending that first request
  // with no Authorization header and getting a spurious 401.
  function updateSession(next) {
    setSession(next);
    setSessionState(next);
  }

  // No role check by design: this dashboard belongs to the clinic's single
  // doctor and patients never log in, so anyone who signs in is admin. This
  // mirrors ADMIN_OPEN_ACCESS on the backend (see middleware/auth.ts) — if
  // one is ever tightened, tighten the other too.
  function acceptSession(result) {
    updateSession(result);
    return result;
  }

  async function login(email, password) {
    return acceptSession(await apiLogin(email, password));
  }

  async function signUp(email, password, fullName) {
    const result = await apiRegister(email, password, fullName);
    if (result.requiresEmailConfirmation) {
      return result;
    }
    acceptSession(result);
    return result;
  }

  function logout() {
    updateSession(null);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, login, signUp, acceptSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
