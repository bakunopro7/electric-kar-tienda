import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ReportesComponent } from './reportes.component';
import { AdminService } from '../core/admin.service';

const stubStats = { ventasTotal: '1200.00', pedidosCount: 10, ticketPromedio: '120.00' };

describe('ReportesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    vi.spyOn(admin, 'ordersStats').mockReturnValue(of(stubStats));
    vi.spyOn(admin, 'clientes').mockReturnValue(of([]));
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
});
