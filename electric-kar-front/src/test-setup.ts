/**
 * Setup global de tests (vitest + jsdom).
 *
 * jsdom no implementa `window.matchMedia`, y librerías como `ngx-sonner` lo
 * llaman en su constructor (para detectar el tema claro/oscuro). Sin este mock,
 * cualquier test que instancie un componente que monte el toaster explota con
 * "window.matchMedia is not a function".
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
