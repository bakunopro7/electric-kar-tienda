export const environment = {
  production: false,
  /**
   * Base URL de la API NestJS (prefijo global `api`).
   * Puerto 3100: en Windows con Docker Desktop, el 3000 cae en el rango TCP
   * reservado por WinNAT/Hyper-V (2924-3023) y el backend no puede bindearlo.
   * El backend debe levantarse con PORT=3100.
   */
  apiUrl: 'http://localhost:3100/api',
  /** Client ID de Google OAuth (déjalo vacío para ocultar el botón). */
  googleClientId:
    '144651038859-68jas5eh7nierc28i3g6oc3flb8tan8u.apps.googleusercontent.com',
};
