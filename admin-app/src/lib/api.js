const API_URL = import.meta.env.VITE_API_URL;
const STORAGE_KEY = 'kusum_admin_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || 'Login failed');
  }
  return body;
}

export async function register(email, password, fullName) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || 'Sign up failed');
  }
  return body;
}

export async function oauthSession(accessToken, refreshToken) {
  const res = await fetch(`${API_URL}/auth/oauth-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || 'Sign-in failed');
  }
  return body;
}

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    setSession(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.text();
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return body;
}
