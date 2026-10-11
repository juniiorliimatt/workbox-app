import { FC } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColorModeToggle from '@/components/ColorModeToggle';
import { ColorModeProvider } from '@/contexts/ColorModeContext';
import { useColorMode } from '@/hooks/useColorMode';
import { COLOR_MODE_STORAGE_KEY } from '@/themes/colorModeStorage';

/** `matchMedia` controlável: só a consulta de tema escuro casa, e dá pra simular o sistema mudando. */
const systemTheme = (() => {
  let dark = false;
  const listeners = new Set<() => void>();
  return {
    install(initialDark: boolean) {
      dark = initialDark;
      listeners.clear();
      window.matchMedia = ((query: string) => ({
        get matches() {
          return query.includes('prefers-color-scheme: dark') ? dark : false;
        },
        media: query,
        onchange: null,
        addListener: (fn: () => void) => listeners.add(fn),
        removeListener: (fn: () => void) => listeners.delete(fn),
        addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    },
    change(nextDark: boolean) {
      dark = nextDark;
      act(() => listeners.forEach((fn) => fn()));
    },
    uninstall() {
      delete (window as { matchMedia?: unknown }).matchMedia;
    },
  };
})();

/** Mostra o que o provedor decidiu: preferência escolhida, modo aplicado e o `palette.mode` que o MUI recebeu. */
const Probe: FC = () => {
  const { preference, mode } = useColorMode();
  const theme = useTheme();
  return <p data-testid="probe">{`${preference}|${mode}|${theme.palette.mode}`}</p>;
};

const renderApp = () =>
  render(
    <ColorModeProvider>
      <Probe />
      <ColorModeToggle />
    </ColorModeProvider>,
  );

const probe = () => screen.getByTestId('probe').textContent;

describe('modo de cor (claro/escuro)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    systemTheme.install(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    systemTheme.uninstall();
  });

  describe('provedor', () => {
    it('sem escolha guardada, segue o sistema: claro quando o sistema é claro', () => {
      renderApp();

      expect(probe()).toBe('system|light|light');
    });

    it('sem escolha guardada, segue o sistema: escuro quando o sistema é escuro', () => {
      systemTheme.install(true);

      renderApp();

      expect(probe()).toBe('system|dark|dark');
    });

    it('acompanha o sistema quando ele muda durante o uso', () => {
      renderApp();
      expect(probe()).toBe('system|light|light');

      systemTheme.change(true);

      expect(probe()).toBe('system|dark|dark');
    });

    it('a escolha explícita guardada ganha do sistema', () => {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');

      renderApp();

      expect(probe()).toBe('dark|dark|dark');
    });

    it('valor inválido guardado é ignorado (volta a seguir o sistema)', () => {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'roxo');

      renderApp();

      expect(probe()).toBe('system|light|light');
    });

    it('escolher um tema aplica na hora, persiste e deixa de seguir o sistema', async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole('button', { name: /Alterar tema/ }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'Escuro' }));

      expect(probe()).toBe('dark|dark|dark');
      expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
      systemTheme.change(false);
      expect(probe()).toBe('dark|dark|dark');
    });

    it('voltar para "Automático" volta a seguir o sistema', async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
      systemTheme.install(true);
      renderApp();
      expect(probe()).toBe('light|light|light');

      await user.click(screen.getByRole('button', { name: /Alterar tema/ }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'Automático (sistema)' }));

      expect(probe()).toBe('system|dark|dark');
      expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('system');
    });

    it('sem localStorage (janela privada, dados bloqueados) continua funcionando', async () => {
      const user = userEvent.setup();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      renderApp();
      expect(probe()).toBe('system|light|light');

      await user.click(screen.getByRole('button', { name: /Alterar tema/ }));
      await user.click(await screen.findByRole('menuitemradio', { name: 'Escuro' }));

      expect(probe()).toBe('dark|dark|dark');
    });

    it('sem o provedor, o hook devolve o padrão seguro (não quebra telas renderizadas isoladas)', () => {
      render(<Probe />);

      expect(screen.getByTestId('probe').textContent).toMatch(/^system\|light\|/);
    });
  });

  describe('botão de tema', () => {
    it('tem nome acessível com o tema atual', () => {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');

      renderApp();

      expect(screen.getByRole('button', { name: 'Alterar tema (atual: Escuro)' })).toBeInTheDocument();
    });

    it('o menu lista as três opções e marca a atual (aria-checked)', async () => {
      const user = userEvent.setup();
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'light');
      renderApp();

      await user.click(screen.getByRole('button', { name: /Alterar tema/ }));

      const menu = within(await screen.findByRole('menu'));
      const options = menu.getAllByRole('menuitemradio');
      expect(options.map((o) => o.textContent)).toEqual(['Claro', 'Escuro', 'Automático (sistema)']);
      expect(options.map((o) => o.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    });

    it('funciona só com o teclado: abre com Enter, escolhe com Enter e devolve o foco ao botão', async () => {
      const user = userEvent.setup();
      renderApp();
      const button = screen.getByRole('button', { name: /Alterar tema/ });

      button.focus();
      await user.keyboard('{Enter}');
      await screen.findByRole('menu');
      await user.keyboard('{ArrowDown}{Enter}');

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(probe()).toMatch(/^(light|dark|system)\|/);
      expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).not.toBeNull();
      await waitFor(() => expect(button).toHaveFocus());
    });

    it('Escape fecha o menu sem mudar nada', async () => {
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole('button', { name: /Alterar tema/ }));
      await screen.findByRole('menu');
      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBeNull();
      expect(probe()).toBe('system|light|light');
    });
  });
});
