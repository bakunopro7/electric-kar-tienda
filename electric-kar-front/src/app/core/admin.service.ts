import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Categoria, Marca, Paginated, Producto } from './models';
import { Rol, UsuarioPanel } from './admin-auth.service';
import { adminContext } from './http-context';

export interface PedidoAdmin {
  id: string;
  folio?: string | null;
  estado: string;
  total: string;
  creadoEn: string;
  cliente?: { id: string; nombre: string; correo: string };
  lineas?: { id: string; cantidad: number; producto?: { nombre: string } }[];
}

export interface ClienteAdmin {
  id: string;
  nombre: string;
  correo: string;
  segmento: string;
  pedidosCount: number;
  totalGastado: string;
  creadoEn: string;
}

export interface UsuarioAdmin extends UsuarioPanel {
  estado: string;
  ultimoAcceso?: string | null;
  creadoEn: string;
}

export interface CuponAdmin {
  id: string;
  codigo: string;
  tipo: string;
  valor: string;
  compraMinima: string;
  usos: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface CfdiAdmin {
  id: string;
  serieFolio?: string | null;
  uuidFiscal?: string | null;
  receptorNombre: string;
  receptorRfc: string;
  total: string;
  estado: string;
  metodoPago: string;
  fecha: string;
}

export interface CreateUsuarioDto {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
}

export interface IntegracionAdmin {
  id: string;
  tipo: string;
  proveedor: string;
  modo: string;
  estado: string;
  webhookUrl?: string | null;
}

export interface MetodoPagoAdmin {
  id: string;
  codigo: string;
  nombre: string;
  comision?: string | null;
  activo: boolean;
}

export interface SesionAdmin {
  id: string;
  dispositivo?: string | null;
  ip?: string | null;
  activa: boolean;
  creadoEn: string;
  usuario?: { id: string; nombre: string; correo: string };
}

export interface ActividadAdmin {
  id: string;
  tipo: string;
  descripcion: string;
  ip?: string | null;
  fecha: string;
  usuario?: { id: string; nombre: string; correo: string };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly ctx = { context: adminContext() };

  // --- Catálogos de apoyo ---------------------------------------------------
  categoriasAll() {
    return this.http.get<Categoria[]>(`${this.api}/categories`, this.ctx);
  }
  marcasAll() {
    return this.http.get<Marca[]>(`${this.api}/marcas`, this.ctx);
  }

  // --- Productos ------------------------------------------------------------
  productos(query: { search?: string; page?: number; limit?: number } = {}) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paginated<Producto>>(`${this.api}/products`, {
      ...this.ctx,
      params,
    });
  }
  crearProducto(dto: Record<string, unknown>) {
    return this.http.post<Producto>(`${this.api}/products`, dto, this.ctx);
  }
  actualizarProducto(id: string, dto: Record<string, unknown>) {
    return this.http.patch<Producto>(`${this.api}/products/${id}`, dto, this.ctx);
  }
  eliminarProducto(id: string) {
    return this.http.delete(`${this.api}/products/${id}`, this.ctx);
  }

  // --- Pedidos --------------------------------------------------------------
  pedidos() {
    return this.http.get<PedidoAdmin[]>(`${this.api}/orders/all`, this.ctx);
  }
  actualizarEstadoPedido(id: string, estado: string) {
    return this.http.patch<PedidoAdmin>(
      `${this.api}/orders/${id}/status`,
      { estado },
      this.ctx,
    );
  }

  // --- Clientes -------------------------------------------------------------
  clientes() {
    return this.http.get<ClienteAdmin[]>(`${this.api}/clientes`, this.ctx);
  }
  actualizarSegmento(id: string, segmento: string) {
    return this.http.patch<ClienteAdmin>(
      `${this.api}/clientes/${id}/segmento`,
      { segmento },
      this.ctx,
    );
  }

  // --- Cupones --------------------------------------------------------------
  cupones() {
    return this.http.get<CuponAdmin[]>(`${this.api}/cupones`, this.ctx);
  }
  crearCupon(dto: Record<string, unknown>) {
    return this.http.post<CuponAdmin>(`${this.api}/cupones`, dto, this.ctx);
  }
  eliminarCupon(id: string) {
    return this.http.delete(`${this.api}/cupones/${id}`, this.ctx);
  }

  // --- CFDI -----------------------------------------------------------------
  cfdis() {
    return this.http.get<CfdiAdmin[]>(`${this.api}/cfdi`, this.ctx);
  }
  emitirCfdi(dto: Record<string, unknown>) {
    return this.http.post<CfdiAdmin>(`${this.api}/cfdi/emitir`, dto, this.ctx);
  }
  timbrarCfdi(id: string) {
    return this.http.post<CfdiAdmin>(`${this.api}/cfdi/${id}/timbrar`, {}, this.ctx);
  }
  cancelarCfdi(id: string, motivoCancelacion: string, uuidSustituye?: string) {
    return this.http.post<CfdiAdmin>(
      `${this.api}/cfdi/${id}/cancelar`,
      { motivoCancelacion, uuidSustituye: uuidSustituye || undefined },
      this.ctx,
    );
  }

  // --- Usuarios del panel (SUPER) ------------------------------------------
  usuarios() {
    return this.http.get<UsuarioAdmin[]>(`${this.api}/users`, this.ctx);
  }
  crearUsuario(dto: CreateUsuarioDto) {
    return this.http.post<UsuarioAdmin>(`${this.api}/users`, dto, this.ctx);
  }
  eliminarUsuario(id: string) {
    return this.http.delete(`${this.api}/users/${id}`, this.ctx);
  }

  // --- Integraciones / métodos de pago -------------------------------------
  integraciones() {
    return this.http.get<IntegracionAdmin[]>(`${this.api}/integraciones`, this.ctx);
  }
  crearIntegracion(dto: Record<string, unknown>) {
    return this.http.post<IntegracionAdmin>(`${this.api}/integraciones`, dto, this.ctx);
  }
  eliminarIntegracion(id: string) {
    return this.http.delete(`${this.api}/integraciones/${id}`, this.ctx);
  }
  metodosPago() {
    return this.http.get<MetodoPagoAdmin[]>(`${this.api}/metodos-pago`, this.ctx);
  }
  upsertMetodoPago(dto: Record<string, unknown>) {
    return this.http.put<MetodoPagoAdmin>(`${this.api}/metodos-pago`, dto, this.ctx);
  }

  // --- Sesiones (SUPER) -----------------------------------------------------
  sesiones() {
    return this.http.get<SesionAdmin[]>(`${this.api}/sesiones`, this.ctx);
  }
  cerrarSesion(id: string) {
    return this.http.delete(`${this.api}/sesiones/${id}`, this.ctx);
  }
  cerrarTodasSesiones() {
    return this.http.delete(`${this.api}/sesiones`, this.ctx);
  }

  // --- Auditoría (SUPER) ----------------------------------------------------
  auditoria() {
    return this.http.get<ActividadAdmin[]>(`${this.api}/auditoria`, this.ctx);
  }
}
