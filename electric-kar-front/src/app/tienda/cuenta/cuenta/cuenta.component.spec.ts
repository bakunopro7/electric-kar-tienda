import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { CuentaComponent } from './cuenta.component';
import { ClienteService, PedidoCliente } from '@core/cliente.service';
import { AuthService } from '@core/auth.service';
import { Paginated } from '@core/models';

const stubPedido: PedidoCliente = {
  id: 'p1',
  folio: 'EK-001',
  estado: 'NUEVO',
  total: '200.00',
  creadoEn: new Date().toISOString(),
};

const stubPaginated: Paginated<PedidoCliente> = {
  data: [stubPedido, { ...stubPedido, id: 'p2' }, { ...stubPedido, id: 'p3' },
         { ...stubPedido, id: 'p4' }, { ...stubPedido, id: 'p5' }],
  meta: { total: 42, page: 1, limit: 20, pages: 3 },
};

const emptyPaginated: Paginated<PedidoCliente> = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, pages: 0 },
};

describe('CuentaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'cliente').mockReturnValue({ id: 'u1', correo: 'test@test.com' });

    const cliente = TestBed.inject(ClienteService);
    vi.spyOn(cliente, 'perfil').mockReturnValue(of({
      id: 'u1', nombre: 'Test User', correo: 'test@test.com',
      segmento: 'NUEVO', pedidosCount: 42, totalGastado: '1000.00', creadoEn: new Date().toISOString(),
    }));
    vi.spyOn(cliente, 'direcciones').mockReturnValue(of([]));
    vi.spyOn(cliente, 'pedidos').mockReturnValue(of(stubPaginated));
  });

  it('order count badge uses meta.total (42), not data.length (5)', async () => {
    const fixture = TestBed.createComponent(CuentaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    // pedidosMeta().total should be 42, not pedidos().length which is 5
    expect(comp.pedidosMeta()?.total).toBe(42);
  });

  it('recent orders renders from .data array', async () => {
    const fixture = TestBed.createComponent(CuentaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.pedidos().length).toBe(5);
  });

  it('empty order history renders gracefully (badge=0, no errors)', async () => {
    const cliente = TestBed.inject(ClienteService);
    vi.spyOn(cliente, 'pedidos').mockReturnValue(of(emptyPaginated));

    const fixture = TestBed.createComponent(CuentaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.pedidosMeta()?.total).toBe(0);
    expect(comp.pedidos().length).toBe(0);
  });
});
