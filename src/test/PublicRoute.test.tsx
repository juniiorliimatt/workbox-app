import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicRoute from '@/routes/PublicRoute';
import { AuthContext } from '@/contexts/AuthContextValue';
import { IAuthContext } from '@/interfaces/IAuthContext';

const createMockAuthContext = (overrides?: Partial<IAuthContext>): IAuthContext => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  mfaRequired: false,
  mfaToken: null,
  login: vi.fn(),
  loginMfa: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

describe('PublicRoute', () => {
  it('renders loading spinner when isLoading is true', () => {
    const authValue = createMockAuthContext({ isLoading: true });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<div>Public Login Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByText('Public Login Page')).not.toBeInTheDocument();
  });

  it('renders public content when user is not authenticated', () => {
    const authValue = createMockAuthContext({ isLoading: false, isAuthenticated: false });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<div>Public Login Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Public Login Page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when user is already authenticated', () => {
    const authValue = createMockAuthContext({
      isLoading: false,
      isAuthenticated: true,
      accessToken: 'valid-jwt-token',
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<div>Public Login Page</div>} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Public Login Page')).not.toBeInTheDocument();
  });
});
