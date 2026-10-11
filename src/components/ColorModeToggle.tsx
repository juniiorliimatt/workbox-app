import { FC, MouseEvent, useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import {
  Check as CheckIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SettingsBrightness as SystemModeIcon,
} from '@mui/icons-material';
import { useColorMode } from '@/hooks/useColorMode';
import type { ColorModePreference } from '@/themes/colorModeStorage';

const OPTIONS: Array<{ value: ColorModePreference; label: string; icon: JSX.Element }> = [
  { value: 'light', label: 'Claro', icon: <LightModeIcon fontSize="small" /> },
  { value: 'dark', label: 'Escuro', icon: <DarkModeIcon fontSize="small" /> },
  { value: 'system', label: 'Automático (sistema)', icon: <SystemModeIcon fontSize="small" /> },
];

/**
 * Botão de tema (claro, escuro ou automático). O ícone mostra a escolha atual e o menu marca a opção ativa
 * (`menuitemradio` + `aria-checked`). Herda a cor do contexto: serve na barra preta e fora dela.
 */
const ColorModeToggle: FC = () => {
  const { preference, setPreference } = useColorMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[2];
  const open = Boolean(anchor);

  const choose = (value: ColorModePreference) => {
    setPreference(value);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title="Tema">
        <IconButton
          id="btn-tema"
          color="inherit"
          aria-label={`Alterar tema (atual: ${current.label})`}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          aria-controls={open ? 'menu-tema' : undefined}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        >
          {current.icon}
        </IconButton>
      </Tooltip>
      <Menu id="menu-tema" anchorEl={anchor} open={open} onClose={() => setAnchor(null)} MenuListProps={{ 'aria-label': 'Tema' }}>
        {OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            role="menuitemradio"
            aria-checked={option.value === preference}
            selected={option.value === preference}
            onClick={() => choose(option.value)}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
            {option.value === preference && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ColorModeToggle;
