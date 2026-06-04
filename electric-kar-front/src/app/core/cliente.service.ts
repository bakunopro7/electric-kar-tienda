import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface PerfilCliente {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string | null;
  rfc?: string | null;
  segmento: string;
  pedidosCount: number;
  totalGastado: string;
  creadoEn: string;
}

export interface Direccion {
  id: string;
  calle: string;
  interior?: string | null;
  colonia?: string | null;
  cp: string;
  ciudad?: string | null;
  estado?: string | null;
}

export interface PedidoCliente {
  id: string;
  folio?: string | null;
  estado: string;
  total: string;
  creadoEn: string;
  lineas?: { id: string; cantidad: number; producto?: { nombre: string } }[];
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  perfil() {
    return this.http.get<PerfilCliente>(`${this.api}/clientes/me`);
  }
  actualizarPerfil(dto: { nombre?: string; telefono?: string; rfc?: string }) {
    return this.http.patch<PerfilCliente>(`${this.api}/clientes/me`, dto);
  }
  direcciones() {
    return this.http.get<Direccion[]>(`${this.api}/clientes/me/direcciones`);
  }
  agregarDireccion(dto: Partial<Direccion>) {
    return this.http.post<Direccion>(`${this.api}/clientes/me/direcciones`, dto);
  }
  eliminarDireccion(id: string) {
    return this.http.delete(`${this.api}/clientes/me/direcciones/${id}`);
  }
  pedidos() {
    return this.http.get<PedidoCliente[]>(`${this.api}/orders`);
  }
}
