import {
  CadenaOriginalGenerator,
  CadenaOriginalNoConfigurada,
  FirmanteCsd,
  sellarXml,
  SelladoNoConfiguradoError,
} from './sellado';

const XML_SIN_SELLO = '<cfdi:Comprobante Version="4.0" Sello="" FormaPago="04"/>';

describe('sellarXml', () => {
  it('(a) genera la cadena, firma y coloca el Sello en base64', async () => {
    const cadenaGen: CadenaOriginalGenerator = { generar: async () => '||cadena||' };
    const firmante: FirmanteCsd = { sign: (data) => `firma(${data})` };

    const xml = await sellarXml(XML_SIN_SELLO, firmante, cadenaGen);

    const esperado = Buffer.from('firma(||cadena||)', 'binary').toString('base64');
    expect(xml).toContain(`Sello="${esperado}"`);
    expect(xml).not.toContain('Sello=""');
  });

  it('(b) firma con algoritmo sha256', async () => {
    const cadenaGen: CadenaOriginalGenerator = { generar: async () => 'C' };
    const sign = jest.fn().mockReturnValue('x');
    await sellarXml(XML_SIN_SELLO, { sign }, cadenaGen);
    expect(sign).toHaveBeenCalledWith('C', 'sha256');
  });

  it('(c) el generador por defecto avisa que falta el XSLT del SAT', async () => {
    await expect(new CadenaOriginalNoConfigurada().generar()).rejects.toBeInstanceOf(
      SelladoNoConfiguradoError,
    );
  });
});
