import { jest } from '@jest/globals';

const signUpMock = jest.fn() as jest.Mock<any>;
const signInWithPasswordMock = jest.fn() as jest.Mock<any>;
const refreshSessionMock = jest.fn() as jest.Mock<any>;
const signOutMock = jest.fn() as jest.Mock<any>;
const singleMock = jest.fn() as jest.Mock<any>;

function buildFromChain() {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: singleMock,
  };
  return chain;
}

const createClientMock = jest.fn(() => ({
  auth: {
    signUp: signUpMock,
    signInWithPassword: signInWithPasswordMock,
    refreshSession: refreshSessionMock,
    signOut: signOutMock,
  },
  from: jest.fn(() => buildFromChain()),
})) as jest.Mock<any>;

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const { AuthService } = await import('../../src/services/AuthService.js');
const { ConflictError, UnauthorizedError } = await import('../../src/utils/errors.js');

function fakeSession() {
  return { access_token: 'access.jwt.token', refresh_token: 'refresh.jwt.token' };
}

function fakeUser() {
  return { id: 'user-1', email: 'a@b.com', app_metadata: { role: 'PATIENT' } };
}

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user and returns tokens on successful signUp', async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: fakeUser(), session: fakeSession() },
      error: null,
    });

    const service = new AuthService();
    const result = await service.register('new@example.com', 'password123', 'New User');

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.refreshToken).toBe('refresh.jwt.token');
  });

  it('returns requiresEmailConfirmation with no tokens when signUp yields no session', async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: fakeUser(), session: null },
      error: null,
    });

    const service = new AuthService();
    const result = await service.register('new@example.com', 'password123', 'New User');

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(result.accessToken).toBeNull();
    expect(result.refreshToken).toBeNull();
  });

  it('throws ConflictError when email already registered', async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { status: 422, message: 'User already registered' },
    });

    const service = new AuthService();

    await expect(service.register('taken@example.com', 'password123', 'Name')).rejects.toThrow(
      ConflictError,
    );
  });
});

describe('AuthService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws UnauthorizedError when credentials are invalid', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const service = new AuthService();

    await expect(service.login('nobody@example.com', 'wrong-password')).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('returns tokens and profile info on successful login', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: fakeUser(), session: fakeSession() },
      error: null,
    });
    singleMock.mockResolvedValueOnce({
      data: { full_name: 'A B', role: 'PATIENT' },
      error: null,
    });

    const service = new AuthService();
    const result = await service.login('a@b.com', 'correct-password');

    expect(result.accessToken).toBe('access.jwt.token');
    expect(result.user.fullName).toBe('A B');
  });
});

describe('AuthService.refreshToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues a new access token for a valid refresh token', async () => {
    refreshSessionMock.mockResolvedValueOnce({
      data: { session: fakeSession() },
      error: null,
    });

    const service = new AuthService();
    const result = await service.refreshToken('valid.refresh.token');

    expect(result.accessToken).toBe('access.jwt.token');
  });

  it('throws UnauthorizedError when refresh token is invalid or expired', async () => {
    refreshSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid refresh token' },
    });

    const service = new AuthService();

    await expect(service.refreshToken('revoked.token')).rejects.toThrow(UnauthorizedError);
  });
});
