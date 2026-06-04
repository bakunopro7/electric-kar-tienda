export interface Autor {
  nombre: string;
  rol: string;
  iniciales: string;
}

export interface Articulo {
  slug: string;
  titulo: string;
  categoria: string;
  fecha: string;
  lectura: string;
  resumen: string;
  destacado?: boolean;
  etiqueta?: string;
  autor: Autor;
  contenido: string[];
}

const AUTOR_DEFAULT: Autor = {
  nombre: 'Carlos Téllez',
  rol: 'Técnico eléctrico automotriz',
  iniciales: 'CT',
};

export const ARTICULOS: Articulo[] = [
  {
    slug: 'cuando-cambiar-bateria',
    titulo: 'Cómo saber cuándo cambiar la batería de tu auto',
    categoria: 'Guías',
    fecha: '2 jun 2026',
    lectura: '6 min de lectura',
    destacado: true,
    autor: AUTOR_DEFAULT,
    resumen:
      'Señales de advertencia, pruebas que puedes hacer en casa y consejos para elegir la batería correcta según tu vehículo y clima.',
    contenido: [
      'Una batería en mal estado da avisos: arranque lento, luces tenues al encender, el clic del marcha o el testigo de batería en el tablero. Si tiene más de 3-4 años, vigílala de cerca.',
      'En casa puedes medir el voltaje en reposo (debe rondar 12.6 V) y al arrancar (no debería caer de 10 V). Si tienes multímetro, es la prueba más rápida.',
      'Al reemplazarla, respeta el grupo (BCI) y el CCA que recomienda el fabricante; en climas fríos o autos con start-stop, una AGM rinde más.',
    ],
  },
  {
    slug: 'instalar-faros-led',
    titulo: 'Guía para instalar faros LED sin errores',
    categoria: 'Iluminación',
    fecha: '28 may 2026',
    lectura: '4 min',
    etiqueta: 'Guía',
    autor: AUTOR_DEFAULT,
    resumen:
      'Paso a paso para cambiar tus halógenos por LED: compatibilidad, polaridad y ajuste del haz.',
    contenido: [
      'Verifica el tipo de bombilla (H4, H7, etc.) y que el kit sea compatible con tu auto. Desconecta la batería antes de empezar.',
      'Respeta la polaridad y asegura una buena disipación de calor. Ajusta el haz para no deslumbrar al tránsito contrario.',
    ],
  },
  {
    slug: 'fallas-electricas-comunes',
    titulo: '5 fallas eléctricas comunes y cómo detectarlas',
    categoria: 'Mantenimiento',
    fecha: '21 may 2026',
    lectura: '7 min',
    autor: AUTOR_DEFAULT,
    resumen:
      'Aprende a identificar problemas de batería, alternador y fusibles antes de que te dejen varado.',
    contenido: [
      'Batería descargada, alternador que no carga, fusibles fundidos, mala conexión a tierra y cables sulfatados son las causas más frecuentes.',
      'Un multímetro y una inspección visual resuelven la mayoría de los diagnósticos iniciales.',
    ],
  },
  {
    slug: 'agm-o-convencional',
    titulo: '¿AGM o convencional? Cómo elegir tu batería',
    categoria: 'Guías',
    fecha: '14 may 2026',
    lectura: '5 min',
    etiqueta: 'Top',
    autor: AUTOR_DEFAULT,
    resumen:
      'Diferencias clave, ventajas de cada tecnología y cuál conviene según tu auto y uso.',
    contenido: [
      'Las AGM ofrecen más ciclos, resisten vibraciones y son ideales para start-stop y mucho equipo eléctrico. Las convencionales son más económicas para autos sencillos.',
    ],
  },
  {
    slug: 'instalar-amplificador',
    titulo: 'Cómo instalar un amplificador de car audio',
    categoria: 'Audio',
    fecha: '6 may 2026',
    lectura: '8 min',
    autor: AUTOR_DEFAULT,
    resumen:
      'Calibre de cable, conexión a tierra y ajuste de ganancia para un sonido limpio y seguro.',
    contenido: [
      'Usa el calibre de cable adecuado a la potencia, una buena tierra y un fusible cerca de la batería. Ajusta la ganancia con cuidado para evitar distorsión.',
    ],
  },
  {
    slug: 'mantener-alternador',
    titulo: 'Mantén tu alternador en óptimas condiciones',
    categoria: 'Mantenimiento',
    fecha: '28 abr 2026',
    lectura: '6 min',
    autor: AUTOR_DEFAULT,
    resumen:
      'Señales de desgaste, voltaje de carga ideal y consejos para alargar su vida útil.',
    contenido: [
      'El voltaje de carga ideal ronda 13.8-14.4 V. Ruidos, luces que parpadean o batería que se descarga apuntan a un alternador en problemas.',
    ],
  },
  {
    slug: 'barras-led-offroad-2026',
    titulo: 'Llegaron las nuevas barras LED Off-Road 2026',
    categoria: 'Novedades',
    fecha: '20 abr 2026',
    lectura: '3 min',
    etiqueta: 'Nuevo',
    autor: AUTOR_DEFAULT,
    resumen:
      'Más lúmenes, menor consumo y diseño resistente al agua. Conoce la nueva línea.',
    contenido: [
      'La nueva línea ofrece mayor alcance, certificación IP68 y menor consumo. Ideal para uso todoterreno.',
    ],
  },
];

export const CATEGORIAS_BLOG = [
  'Todos',
  'Guías',
  'Mantenimiento',
  'Iluminación',
  'Audio',
  'Novedades',
];

export const findArticulo = (slug: string) =>
  ARTICULOS.find((a) => a.slug === slug) ?? null;
