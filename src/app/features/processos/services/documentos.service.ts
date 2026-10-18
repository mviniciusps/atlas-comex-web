import { Injectable } from '@angular/core';

export type TipoDocumento =
  | 'Invoice'
  | 'Packing List'
  | 'Conhecimento de carga'
  | 'Certificado'
  | 'Outro';

export interface DocumentoProcesso {
  id: number;
  nome: string;
  tamanho: string;
  tipo: TipoDocumento;
  status: 'Aguardando conferência' | 'Conferido' | 'Com divergência';
  arquivo: File;
  incluirNaDuimp: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentosService {
  private readonly documentosPorProcesso = new Map<
    string,
    DocumentoProcesso[]
  >();

  private proximoId = 1;

  listar(numeroProcesso: string): DocumentoProcesso[] {
    return this.documentosPorProcesso.get(numeroProcesso) ?? [];
  }

  adicionar(
    numeroProcesso: string,
    documentos: Omit<DocumentoProcesso, 'id' | 'incluirNaDuimp'>[],
  ): void {
    const documentosAtuais = this.listar(numeroProcesso);
    const novosDocumentos = documentos.map((documento) => ({
      ...documento,
      id: this.proximoId++,
      incluirNaDuimp: false,
    }));

    this.documentosPorProcesso.set(numeroProcesso, [
      ...documentosAtuais,
      ...novosDocumentos,
    ]);
  }

  remover(numeroProcesso: string, id: number): void {
    const documentosAtualizados = this.listar(numeroProcesso).filter(
      (documento) => documento.id !== id,
    );

    this.documentosPorProcesso.set(numeroProcesso, documentosAtualizados);
  }

  atualizarTipo(
    numeroProcesso: string,
    id: number,
    tipo: TipoDocumento,
  ): void {
    const documentosAtualizados = this.listar(numeroProcesso).map(
      (documento) =>
        documento.id === id ? { ...documento, tipo } : documento,
    );

    this.documentosPorProcesso.set(numeroProcesso, documentosAtualizados);
  }

  atualizarStatus(
    numeroProcesso: string,
    id: number,
    status: DocumentoProcesso['status'],
  ): void {
    const documentosAtualizados = this.listar(numeroProcesso).map(
      (documento) =>
        documento.id === id ? { ...documento, status } : documento,
    );

    this.documentosPorProcesso.set(numeroProcesso, documentosAtualizados);
  }

  atualizarInclusaoDuimp(
    numeroProcesso: string,
    id: number,
    incluirNaDuimp: boolean,
  ): void {
    const documentosAtualizados = this.listar(numeroProcesso).map(
      (documento) =>
        documento.id === id ? { ...documento, incluirNaDuimp } : documento,
    );

    this.documentosPorProcesso.set(numeroProcesso, documentosAtualizados);
  }
}
