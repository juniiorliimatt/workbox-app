import { createContext } from 'react';
import type { ResolvedColorMode } from '@/themes';
import type { ColorModePreference } from '@/themes/colorModeStorage';

export interface IColorModeContext {
  /** O que o usuário escolheu (inclui "seguir o sistema"). */
  preference: ColorModePreference;
  /** O tema efetivamente aplicado agora. */
  mode: ResolvedColorMode;
  setPreference: (preference: ColorModePreference) => void;
}

/** Padrão sem provedor (telas renderizadas isoladas, ex.: em testes): claro, sem efeito ao escolher. */
export const ColorModeContext = createContext<IColorModeContext>({
  preference: 'system',
  mode: 'light',
  setPreference: () => undefined,
});
