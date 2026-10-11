import { useTheme } from '@mui/material';

/**
 * Cores de eixo, grade, tooltip e legenda do recharts a partir do tema. O recharts pinta tudo com cinzas fixos (`#666`,
 * `#ccc`, tooltip branco) que ficam ilegíveis no tema escuro; espalhe estes objetos nos componentes do gráfico:
 * `<CartesianGrid {...chart.grid} />`, `<XAxis {...chart.axis} />`, `<Tooltip {...chart.tooltip} />`, `<Legend {...chart.legend} />`.
 */
export const useChartTheme = () => {
  const { palette } = useTheme();
  return {
    grid: { stroke: palette.divider },
    axis: { stroke: palette.divider, tick: { fill: palette.text.secondary } },
    tooltip: {
      contentStyle: {
        backgroundColor: palette.background.paper,
        border: `1px solid ${palette.divider}`,
        borderRadius: 8,
        color: palette.text.primary,
      },
      labelStyle: { color: palette.text.primary },
      itemStyle: { color: palette.text.primary },
    },
    legend: { wrapperStyle: { color: palette.text.primary } },
  };
};

export default useChartTheme;
