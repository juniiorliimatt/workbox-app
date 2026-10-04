const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Tamanho de arquivo legível (base 1024, vírgula decimal); `null`, `undefined`, `NaN` e negativos viram "—". */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '—';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${BYTE_UNITS[unit]}`;
};

/** Valor monetário em BRL; `null`, `undefined` e `NaN` viram zero. */
export const formatCurrency = (value: number | null | undefined): string => {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
