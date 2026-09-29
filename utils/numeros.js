export const redondear = (n, decimales = 2) => {
  const factor = 10 ** decimales;
  return Math.round((Number(n) + Number.EPSILON) * factor) / factor;
};
