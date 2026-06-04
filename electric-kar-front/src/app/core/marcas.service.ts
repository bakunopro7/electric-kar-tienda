import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Marca } from './models';

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/marcas`;

  list() {
    return this.http.get<Marca[]>(this.base);
  }
}
