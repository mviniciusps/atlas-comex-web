import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ImportadorApiDto,
  ImportadorCadastroDto,
  ImportadorCriadoApiDto,
} from '../models/importador-api.model';

@Injectable({
  providedIn: 'root',
})
export class ImportadoresService {
  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ImportadorApiDto[]> {
    return this.http.get<ImportadorApiDto[]>(
      `${environment.apiBaseUrl}/importadores`,
    );
  }

  criar(dados: ImportadorCadastroDto): Observable<ImportadorCriadoApiDto> {
    return this.http.post<ImportadorCriadoApiDto>(
      `${environment.apiBaseUrl}/importadores`,
      dados,
    );
  }
}
