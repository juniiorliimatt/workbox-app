/** Valor monetário em BRL; `null`, `undefined` e `NaN` viram zero. */
export const formatCurrency = (value: number | null | undefined): string => {
  const amount = Number(value);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
