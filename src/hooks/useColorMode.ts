import { useContext } from 'react';
import { ColorModeContext, IColorModeContext } from '@/contexts/ColorModeContextValue';

/** Tema atual e como trocá-lo (ver `ColorModeProvider`). */
export const useColorMode = (): IColorModeContext => useContext(ColorModeContext);

export default useColorMode;
