import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ReportesComponent } from './reportes.component';
import { AdminService, ClienteAdmin } from '@core/admin.service';

const stubStats = { ventasTotal: '1200.00', pedidosCount: 10, ticketPromedio: '120.00' };

const stubTopClientes: ClienteAdmin[] = [
  { id: 'c1', nombre: 'A', correo: 'a@t.com', segmento: 'FRECUENTE', pedidosCount: 10, totalGastado: '1000.00', creadoEn: new Date().toISOString() },
  { id: 'c2', nombre: 'B', correo: 'b@t.com', segmento: 'FRECUENTE', pedidosCount: 8,  totalGastado: '800.00',  creadoEn: new Date().toISOString() },
  { id: 'c3', nombre: 'C', correo: 'c@t.com', segmento: 'NUEVO',     pedidosCount: 5,  totalGastado: '500.00',  creadoEn: new Date().toISOString() },
  { id: 'c4', nombre: 'D', correo: 'd@t.com', segmento: 'NUEVO',     pedidosCount: 2,  totalGastado: '200.00',  creadoEn: new Date().toISOString() },
  { id: 'c5', nombre: 'E', correo: 'e@t.com', segmento: 'NUEVO',     pedidosCount: 1,  totalGastado: '100.00',  creadoEn: new Date().toISOString() },
];

describe('ReportesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    vi.spyOn(admin, 'ordersStats').mockReturnValue(of(stubStats));
    vi.spyOn(admin, 'clientesTop').mockReturnValue(of(stubTopClientes));
    vi.spyOn(admin, 'clientesStats').mockReturnValue(of({ total: 88 }));
  });

  it('ventasTotal KPI comes from ordersStats()', async () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.stats().ventasTotal).toBe('1200.00');
  });

  it('pedidosCount KPI comes from ordersStats()', async () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.stats().pedidosCount).toBe(10);
  });

  it('ticketPromedio KPI comes from ordersStats()', async () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.stats().ticketPromedio).toBe('120.00');
  });

  it('topClientes signal comes from clientesTop(), not from sorting full list', async () => {
    const admin = TestBed.inject(AdminService);
    const topSpy = vi.spyOn(admin, 'clientesTop').mockReturnValue(of(stubTopClientes));
    const clientesSpy = vi.spyOn(admin, 'clientes' as any);

    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(topSpy).toHaveBeenCalled();
    expect(comp.topClientes().length).toBe(5);
    // admin.clientes() should NOT be called
    expect(clientesSpy).not.toHaveBeenCalled();
  });

  it('clientes count KPI comes from clientesStats().total', async () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.clientesStats().total).toBe(88);
  });
});
