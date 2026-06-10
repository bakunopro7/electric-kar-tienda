import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { PedidosComponent } from './pedidos.component';
import { AdminService, PedidoAdmin } from '@core/admin.service';
import { Paginated } from '@core/models';

const stubOrder: PedidoAdmin = {
  id: 'o1',
  folio: 'EK-001',
  estado: 'NUEVO',
  total: '100.00',
  creadoEn: new Date().toISOString(),
};

const stubPaginated: Paginated<PedidoAdmin> = {
  data: [stubOrder, { ...stubOrder, id: 'o2', folio: 'EK-002' }],
  meta: { total: 2, page: 1, limit: 20, pages: 1 },
};

describe('PedidosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    vi.spyOn(admin, 'pedidos').mockReturnValue(of(stubPaginated));
  });

  it('renders 2 rows from data (Paginated shape)', async () => {
    const fixture = TestBed.createComponent(PedidosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('meta.total is reflected correctly', async () => {
    const fixture = TestBed.createComponent(PedidosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.meta().total).toBe(2);
  });
});
