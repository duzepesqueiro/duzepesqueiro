const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatBRL = (value: number): string => {
  const numeric = Number.isFinite(value) ? value : 0;
  return brlFormatter.format(numeric);
};
