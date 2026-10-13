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
  status: string;
  arquivo: File;
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
    documentos: Omit<DocumentoProcesso, 'id'>[],
  ): void {
    const documentosAtuais = this.listar(numeroProcesso);
    const novosDocumentos = documentos.map((documento) => ({
      ...documento,
      id: this.proximoId++,
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
    const doucmentosAtualizados = this.listar(numeroProcesso).map((documento) => documento.id === id ? { ...documento, tipo } : documento,);

    this.documentosPorProcesso.set(numeroProcesso, doucmentosAtualizados);
  }
}