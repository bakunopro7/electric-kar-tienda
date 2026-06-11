import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AdminService, PedidoAdmin } from '@core/admin.service';
import { Paginated } from '@core/models';

const stubStats = { ventasTotal: '500.00', pedidosCount: 5, ticketPromedio: '100.00' };
const stubOrder: PedidoAdmin = {
  id: 'o1', folio: 'EK-001', estado: 'NUEVO', total: '100.00', creadoEn: new Date().toISOString(),
};
const stubPaginated: Paginated<PedidoAdmin> = {
  data: [stubOrder],
  meta: { total: 1, page: 1, limit: 20, pages: 1 },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubPaginatedProd: Paginated<any> = {
  data: [],
  meta: { total: 0, page: 1, limit: 100, pages: 1 },
};

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    vi.spyOn(admin, 'pedidos').mockReturnValue(of(stubPaginated));
    vi.spyOn(admin, 'ordersStats').mockReturnValue(of(stubStats));
    vi.spyOn(admin, 'clientesStats').mockReturnValue(of({ total: 23 }));
    vi.spyOn(admin, 'productos').mockReturnValue(of(stubPaginatedProd));
  });

  it('KPI ventas comes from ordersStats() (ventasTotal), not from array reduce', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.ventasTotal()).toBe('500.00');
  });

  it('KPI pedidosCount comes from ordersStats()', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.pedidosCount()).toBe(5);
  });

  it('recent-orders are rendered from pedidos().data', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.recentOrders().length).toBe(1);
  });

  it('clientes count KPI comes from clientesStats().total (not clientes().length)', async () => {
    const admin = TestBed.inject(AdminService);
    const clientesSpy = vi.spyOn(admin, 'clientes' as keyof typeof admin);
    const statsSpy = vi.spyOn(admin, 'clientesStats').mockReturnValue(of({ total: 23 }));

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.clientesStats().total).toBe(23);
    expect(statsSpy).toHaveBeenCalled();
    // admin.clientes() should NOT be called
    expect(clientesSpy).not.toHaveBeenCalled();
  });
});
