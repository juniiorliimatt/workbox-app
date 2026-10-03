import { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { shiftLightLevel, SHIFT_LED_COUNT } from '@/utils/forza';

export interface IShiftLightsProps {
  rpm: number;
  /** Limite de rotação do carro atual (`engineMaxRpm` do snapshot). */
  maxRpm: number;
}

type LedColor = 'green' | 'red' | 'blue';

const PALETTE: Record<LedColor, string> = { green: 'success.main', red: 'error.main', blue: 'info.main' };

/** Primeiro terço verde, segundo vermelho, último azul — como nos volantes de F1. */
const colorOf = (index: number): LedColor => {
  const third = SHIFT_LED_COUNT / 3;
  if (index < third) return 'green';
  if (index < third * 2) return 'red';
  return 'blue';
};

/**
 * Shift light: LEDs que acendem conforme a rotação se aproxima do limite do carro; ao chegar no
 * ponto de troca todos acendem piscando e aparece "Troque de marcha" (texto, não só cor). O
 * piscar respeita `prefers-reduced-motion`.
 */
const ShiftLights: FC<IShiftLightsProps> = ({ rpm, maxRpm }) => {
  const { lit, shiftNow } = shiftLightLevel(rpm, maxRpm);
  const percent = maxRpm > 0 && Number.isFinite(rpm) ? Math.round((rpm / maxRpm) * 100) : 0;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        role="img"
        aria-label={`Rotação em ${percent}% do limite do motor`}
        sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.5, sm: 1 }, py: 1 }}
      >
        {Array.from({ length: SHIFT_LED_COUNT }, (_, index) => {
          const color = colorOf(index);
          const isLit = index < lit;
          return (
            <Box
              key={index}
              data-testid="shift-led"
              data-lit={isLit}
              data-color={color}
              data-flashing={isLit && shiftNow}
              sx={{
                width: { xs: 18, sm: 28 },
                height: { xs: 18, sm: 28 },
                borderRadius: '50%',
                bgcolor: isLit ? PALETTE[color] : 'action.disabledBackground',
                boxShadow: isLit ? (theme) => `0 0 10px ${theme.palette[color === 'green' ? 'success' : color === 'red' ? 'error' : 'info'].main}` : 'none',
                '@keyframes shiftFlash': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
                animation: isLit && shiftNow ? 'shiftFlash 0.25s steps(1) infinite' : 'none',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          );
        })}
      </Box>
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700, minHeight: '1.75em', color: 'error.main' }}>
        {shiftNow ? 'Troque de marcha' : ''}
      </Typography>
    </Box>
  );
};

export default ShiftLights;
