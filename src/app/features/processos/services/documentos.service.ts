import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { DocumentoProcesso, TipoDocumento, StatusConferenciaDocumento } from '../models/documento-processo.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentosService {
  private readonly apiUrl = `${environment.apiBaseUrl}/processos`;

  constructor(private readonly http: HttpClient) { }

  listar(idProcesso: number): Observable<DocumentoProcesso[]> {
    return this.http.get<DocumentoProcesso[]>(
      `${this.apiUrl}/${idProcesso}/documentos`,
    );
  }

  baixar(idProcesso: number, idDocumento: number): Observable<Blob> {
  return this.http.get(
    `${this.apiUrl}/${idProcesso}/documentos/${idDocumento}/arquivo`,
    { responseType: 'blob' }, //Blob representa os bytes do arquivo recebidos da API
  );
}

  enviar(
    idProcesso: number,
    arquivo: File,
    tipoDocumento: TipoDocumento,
    incluirNaDuimp = false,
  ): Observable<DocumentoProcesso> {
    const dados = new FormData();
    dados.append('Arquivo', arquivo);
    dados.append('TipoDocumento', tipoDocumento);
    dados.append('IncluirNaDuimp', String(incluirNaDuimp));

    return this.http.post<DocumentoProcesso>(
      `${this.apiUrl}/${idProcesso}/documentos`,
      dados,
    );
  }

  atualizarInclusaoDuimp(
    idProcesso: number,
    idDocumento: number,
    incluirNaDuimp: boolean,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${idProcesso}/documentos/${idDocumento}/inclusao-duimp`,
      { incluirNaDuimp },
    );
  }

  atualizarTipo(
    idProcesso: number,
    idDocumento: number,
    tipoDocumento: TipoDocumento,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${idProcesso}/documentos/${idDocumento}/tipo`,
      { tipoDocumento },
    );
  }

  atualizarStatusConferencia(
    idProcesso: number,
    idDocumento: number,
    statusConferencia: StatusConferenciaDocumento,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${idProcesso}/documentos/${idDocumento}/status-conferencia`,
      { statusConferencia },
    );
  }

  excluir(
    idProcesso: number,
    idDocumento: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${idProcesso}/documentos/${idDocumento}`,
    );
  }
}
