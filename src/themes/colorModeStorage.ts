/** O que o usuário escolheu: um tema fixo ou "seguir o sistema". */
export type ColorModePreference = 'light' | 'dark' | 'system';

export const COLOR_MODE_STORAGE_KEY = 'workbox.colorMode';

const isPreference = (value: unknown): value is ColorModePreference => value === 'light' || value === 'dark' || value === 'system';

// localStorage pode lançar (janela privada, dados bloqueados): a escolha do tema é conveniência, nunca requisito.
export const readColorModePreference = (): ColorModePreference => {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

export const writeColorModePreference = (preference: ColorModePreference): void => {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, preference);
  } catch {
    // sem persistência: a escolha vale só nesta sessão da tela
  }
};
