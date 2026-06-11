export interface Articulo {
  slug: string;
  titulo: string;
  categoria: string;
  fecha: string;
  resumen: string;
  contenido: string[];
}

export const ARTICULOS: Articulo[] = [
  {
    slug: 'como-elegir-bateria',
    titulo: 'Cómo elegir la batería correcta para tu auto',
    categoria: 'Guías',
    fecha: '2026-05-28',
    resumen:
      'Voltaje, amperaje de arranque en frío (CCA) y tecnología AGM vs. convencional: todo lo que debes saber.',
    contenido: [
      'Elegir la batería correcta evita fallas de arranque y alarga la vida del sistema eléctrico. Lo primero es revisar el grupo (BCI) que recomienda el fabricante de tu auto.',
      'El CCA (corriente de arranque en frío) es clave en climas fríos: a mayor CCA, más fuerza de arranque. Las baterías AGM ofrecen más ciclos y son ideales para autos con start-stop o mucho equipo eléctrico.',
      'Si tienes dudas, nuestros técnicos te ayudan a identificar el modelo exacto según tu vehículo.',
    ],
  },
  {
    slug: 'leds-vs-halogenos',
    titulo: 'Faros LED vs. halógenos: ¿cuál conviene?',
    categoria: 'Iluminación',
    fecha: '2026-05-20',
    resumen:
      'Comparamos consumo, vida útil, temperatura de color y legalidad para que tomes la mejor decisión.',
    contenido: [
      'Los faros LED consumen menos energía y duran hasta 10 veces más que los halógenos, además de ofrecer una luz más blanca (6000-6500K) y mayor alcance.',
      'Asegúrate de elegir kits con buena disipación de calor y patrón de luz correcto para no deslumbrar al tránsito contrario.',
    ],
  },
  {
    slug: 'instalar-autoestereo',
    titulo: 'Instala tu autoestéreo 2-DIN paso a paso',
    categoria: 'Audio',
    fecha: '2026-05-12',
    resumen:
      'Una guía práctica para montar tu pantalla con CarPlay sin morir en el intento.',
    contenido: [
      'Desconecta la batería antes de empezar. Retira el tablero con cuidado usando palancas plásticas para no dañar el acabado.',
      'Conecta el arnés respetando los colores, fija la cámara de reversa y prueba todas las funciones antes de cerrar el tablero.',
    ],
  },
];

export const findArticulo = (slug: string) =>
  ARTICULOS.find((a) => a.slug === slug) ?? null;
