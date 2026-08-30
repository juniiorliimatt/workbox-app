import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
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

describe('ProtectedRoute', () => {
  it('renders loading spinner when isLoading is true', () => {
    const authValue = createMockAuthContext({ isLoading: true });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to / when user is not authenticated', () => {
    const authValue = createMockAuthContext({ isLoading: false, isAuthenticated: false });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/" element={<div>Public Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Public Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    const authValue = createMockAuthContext({
      isLoading: false,
      isAuthenticated: true,
      accessToken: 'valid-jwt-token',
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
