import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { CfdiComponent } from './cfdi.component';
import { AdminService, CfdiAdmin, PedidoAdmin } from '@core/admin.service';
import { Paginated } from '@core/models';

const stubOrder: PedidoAdmin = {
  id: 'o1', folio: 'EK-001', estado: 'NUEVO', total: '100.00', creadoEn: new Date().toISOString(),
};
const stubPaginatedOrders: Paginated<PedidoAdmin> = {
  data: [stubOrder],
  meta: { total: 1, page: 1, limit: 100, pages: 1 },
};

const stubCfdi: CfdiAdmin = {
  id: 'c1',
  receptorNombre: 'Test Corp',
  receptorRfc: 'TEST010101ABC',
  total: '200.00',
  estado: 'POR_TIMBRAR',
  metodoPago: 'PUE',
  fecha: new Date().toISOString(),
};
const stubPaginatedCfdi: Paginated<CfdiAdmin> = {
  data: [stubCfdi],
  meta: { total: 1, page: 1, limit: 20, pages: 1 },
};

describe('CfdiComponent', () => {
  let pedidosSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CfdiComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    pedidosSpy = vi.spyOn(admin, 'pedidos').mockReturnValue(of(stubPaginatedOrders));
    vi.spyOn(admin, 'cfdis').mockReturnValue(of(stubPaginatedCfdi));
  });

  it('pedido selector is populated from pedidos({ page:1, limit:100 }).data', async () => {
    const fixture = TestBed.createComponent(CfdiComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.pedidos().length).toBe(1);
    expect(comp.pedidos()[0].id).toBe('o1');
    expect(pedidosSpy).toHaveBeenCalledWith({ page: 1, limit: 100 });
  });

  it('CFDI list is populated from cfdis().data', async () => {
    const fixture = TestBed.createComponent(CfdiComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.cfdis().length).toBe(1);
    expect(comp.cfdis()[0].id).toBe('c1');
  });
});
