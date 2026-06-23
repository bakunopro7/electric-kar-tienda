# Guía: conseguir CSD de pruebas y cuenta de PAC (CFDI 4.0)

Para timbrar facturas de verdad necesitás **dos cosas que no se resuelven con código** —
son trámites externos. Esta guía las separa en **PRUEBAS** (para desarrollar y probar)
y **PRODUCCIÓN** (para facturar de verdad).

> Glosario rápido
> - **CSD** = Certificado de Sello Digital. Es lo que firma (sella) la factura. **NO es la e.firma.**
> - **PAC** = Proveedor Autorizado de Certificación. Es quien timbra (pone el folio fiscal/UUID del SAT). Nosotros elegimos **timbrado puro**: armamos y sellamos el XML, el PAC solo timbra.
> - **e.firma** (antes FIEL) = la firma electrónica del contribuyente. Se usa para **generar el CSD**, no para sellar facturas.

---

## PARTE 1 — Entorno de PRUEBAS (lo que necesitamos AHORA)

Con esto podés probar todo el flujo sin facturar de verdad ni gastar timbres reales.

### 1.1 Cuenta de PAC en sandbox

1. Elegí un PAC. Recomendado: **SW (Smarter Web / sw.com.mx)** por su API REST y buen sandbox. Alternativa: **Finkok** (SOAP).
2. Registrate en su portal de **sandbox/pruebas** (es gratis). En SW: pedí acceso a `sandbox` y obtené:
   - **Usuario y contraseña** (o token) de la API de pruebas.
   - La **URL base de pruebas** del API.
3. Guardá esas credenciales — irán en el modelo `Integracion` (tipo `PAC`, modo `PRUEBAS`) cuando hagamos F3.

### 1.2 CSD de pruebas

No hace falta tu CSD real para probar. Hay dos caminos:

- **Opción A (la más fácil):** usar el **CSD de pruebas que publica el SAT/el PAC**. El SAT publica certificados de prueba (el RFC de pruebas típico es `EKU9003173C9`). Los PACs los aceptan en sandbox y normalmente te los dan junto con las credenciales. Pedíselos a tu PAC: `.cer`, `.key` y su **contraseña**.
- **Opción B:** generar un CSD de pruebas propio con el RFC genérico de pruebas, usando la app **Certifica** del SAT (ver Parte 2, mismo procedimiento).

### 1.3 Cargarlo en el sistema

Ya tenemos el endpoint listo (de F0):

```
POST /cfdi/csd        (rol SUPER)
body: { cerBase64, keyBase64, password, modo: "PRUEBAS" }
```

- Convertí el `.cer` y el `.key` a **base64** y mandalos en el body.
- El sistema valida que el RFC del certificado coincida con `EMISOR_RFC`, que esté vigente, y que la contraseña abra la llave. Luego lo guarda **cifrado**.
- ⚠️ En pruebas, `EMISOR_RFC` (en `.env`) debe ser el **RFC del CSD de pruebas** (p.ej. `EKU9003173C9`), no el real.

---

## PARTE 2 — Entorno de PRODUCCIÓN (cuando vayas a facturar de verdad)

### 2.1 Requisitos previos
- **RFC activo** de la empresa/persona.
- **e.firma** vigente (archivos `.cer` + `.key` + contraseña de la e.firma).

### 2.2 Generar el CSD real
1. Descargá la aplicación **Certifica** del SAT (la del portal oficial del SAT).
2. Abrila → elegí **"Solicitud de Certificados de Sello Digital (CSD)"**.
3. Cargá tu **e.firma**, definí una **contraseña para el CSD** (anotala bien) y generá el archivo de requerimiento (`.sdg`).
4. Entrá al **portal del SAT** → trámite de **Certificados de Sello Digital** → subí el `.sdg`.
5. Descargá tu **`.cer`**. La **`.key`** es la que generó Certifica. Contraseña: la que pusiste.

### 2.3 Contratar el PAC en producción
- Pasá tu cuenta del PAC a **producción** (es de paga, se cobra por timbre o por paquete).
- Obtené las credenciales de **producción** y la URL base productiva.

### 2.4 Cargarlo
- Mismo endpoint `POST /cfdi/csd` pero con `modo: "PRODUCCION"` y el CSD real.
- `EMISOR_RFC`, `EMISOR_REGIMEN` y el CP del emisor en `.env` deben ser los **reales**.

---

## Checklist

**Pruebas (ahora):**
- [ ] Cuenta de PAC en sandbox (SW recomendado) + credenciales de prueba
- [ ] CSD de pruebas (`.cer` + `.key` + contraseña) — pedíselo al PAC o usá el genérico del SAT
- [ ] `EMISOR_RFC` en `.env` = RFC del CSD de pruebas
- [ ] `CSD_MASTER_KEY` configurada en `.env` (clave larga y aleatoria para cifrar el CSD)
- [ ] Cargar el CSD con `POST /cfdi/csd` (modo PRUEBAS)

**Producción (después):**
- [ ] e.firma vigente
- [ ] CSD real generado con Certifica
- [ ] PAC en modo producción + credenciales
- [ ] Datos del emisor reales en `.env`

---

## Qué sigue del lado del código

Cuando tengas el **CSD de pruebas** y las **credenciales del PAC**, retomamos:
- **F2 (cierre):** generador real de cadena original (XSLT oficial del SAT) + validación XSD.
- **F3:** integración del PAC (timbrado real) — reemplaza el `randomUUID` simulado.

Sin el CSD de pruebas no se puede verificar el sellado de punta a punta, por eso paramos acá.
