import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ClientesComponent } from './clientes.component';
import { AdminService, ClienteAdmin } from '@core/admin.service';
import { Paginated } from '@core/models';

const stubCliente: ClienteAdmin = {
  id: 'c1',
  nombre: 'Cliente Uno',
  correo: 'c1@test.com',
  segmento: 'NUEVO',
  pedidosCount: 3,
  totalGastado: '600.00',
  creadoEn: new Date().toISOString(),
};

const stubPaginated: Paginated<ClienteAdmin> = {
  data: [stubCliente, { ...stubCliente, id: 'c2', nombre: 'Cliente Dos' }],
  meta: { total: 2, page: 1, limit: 20, pages: 1 },
};

describe('ClientesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const admin = TestBed.inject(AdminService);
    vi.spyOn(admin, 'clientes').mockReturnValue(of(stubPaginated));
  });

  it('table renders data rows from Paginated shape', async () => {
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.clientes().length).toBe(2);
  });

  it('meta reflects total and page from paginated response', async () => {
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.clientesMeta()?.total).toBe(2);
    expect(comp.clientesMeta()?.page).toBe(1);
  });
});
