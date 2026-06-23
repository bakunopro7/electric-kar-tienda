/**
 * Sellado del CFDI 4.0. El sello es la firma SHA256/RSA de la CADENA ORIGINAL
 * (no del XML directo), codificada en base64, insertada en el atributo Sello.
 *
 * La cadena original se obtiene aplicando el XSLT oficial del SAT
 * (cadenaoriginal_4_0.xslt) al XML. Ese paso se inyecta vía CadenaOriginalGenerator
 * porque depende de recursos del SAT; la firma en sí es independiente y testeable.
 */

/** Genera la cadena original a partir del XML sin sellar (XSLT oficial del SAT). */
export interface CadenaOriginalGenerator {
  generar(xmlSinSello: string): Promise<string>;
}

/** Firma datos con la llave privada del CSD. Lo implementa Credential de @nodecfdi. */
export interface FirmanteCsd {
  sign(data: string, algorithm?: string): string;
}

export class SelladoNoConfiguradoError extends Error {}

/**
 * Generador por defecto: lanza error claro. Se reemplaza por uno real cuando se
 * disponga del XSLT oficial del SAT (F2 — pendiente de recursos SAT).
 */
export class CadenaOriginalNoConfigurada implements CadenaOriginalGenerator {
  generar(): Promise<string> {
    return Promise.reject(
      new SelladoNoConfiguradoError(
        'La cadena original requiere el XSLT oficial del SAT (cadenaoriginal_4_0.xslt). ' +
          'Configurá un CadenaOriginalGenerator antes de sellar.',
      ),
    );
  }
}

/** Sella el XML: cadena original -> firma -> base64 -> atributo Sello. */
export async function sellarXml(
  xmlSinSello: string,
  firmante: FirmanteCsd,
  cadenaGen: CadenaOriginalGenerator,
): Promise<string> {
  const cadena = await cadenaGen.generar(xmlSinSello);
  const firmaBinaria = firmante.sign(cadena, 'sha256');
  const sello = Buffer.from(firmaBinaria, 'binary').toString('base64');
  // base64 no contiene caracteres especiales de XML, es seguro en el atributo.
  return xmlSinSello.replace('Sello=""', `Sello="${sello}"`);
}
