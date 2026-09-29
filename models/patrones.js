export const PATRONES = Object.freeze({
  nombre: /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  documento: /^\d{6,12}$/,
  telefono: /^\+?\d{7,15}$/,
  foto: /^(https?:\/\/\S+|[\w\-./\\: ]+\.(jpe?g|png|webp))$/i,
});
