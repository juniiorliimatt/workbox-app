import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Forza from '@/pages/Forza';
import { AuthContext } from '@/contexts/AuthContextValue';
import { createAuthValue } from './helpers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => mockNavigate }));

const renderHub = () =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <BrowserRouter>
        <Forza />
      </BrowserRouter>
    </AuthContext.Provider>,
  );

describe('Forza · hub do módulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presents the module and its sections', () => {
    renderHub();

    expect(screen.getByText(/Workbox Forza/i)).toBeInTheDocument();
    expect(screen.getByText('Sessões')).toBeInTheDocument();
    expect(screen.getByText('Ao vivo')).toBeInTheDocument();
    expect(screen.getByText(/forza-telemetry-service/)).toBeInTheDocument();
  });

  it('navigates to the sessions list', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByText('Sessões'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/sessoes');
  });

  it('navigates to the live view', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByText('Ao vivo'));

    expect(mockNavigate).toHaveBeenCalledWith('/forza/ao-vivo');
  });

  it('offers a way back to the modules hub', () => {
    renderHub();

    expect(screen.getByRole('button', { name: /Voltar aos Módulos/i })).toBeInTheDocument();
  });
});
