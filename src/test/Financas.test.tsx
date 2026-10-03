import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Financas from '@/pages/Financas';
import { AuthContext } from '@/contexts/AuthContextValue';
import { createAuthValue } from './forza/helpers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => mockNavigate }));

const renderHub = () =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <BrowserRouter>
        <Financas />
      </BrowserRouter>
    </AuthContext.Provider>,
  );

describe('Finanças · hub do módulo', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['Receitas', '/financas/receitas'],
    ['Despesas', '/financas/despesas'],
    ['Metas e Orçamentos', '/financas/orcamentos'],
    ['Gerenciamento de Tipos', '/financas/tipos'],
  ])('card "%s" navigates to %s', async (title, path) => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByText(title));

    expect(mockNavigate).toHaveBeenCalledWith(path);
  });
});
