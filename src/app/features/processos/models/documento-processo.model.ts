export type TipoDocumento =
  | 'Invoice'
  | 'Packing List'
  | 'Conhecimento de carga'
  | 'Certificado'
  | 'Outro';

export interface DocumentoProcesso {
  idDocumento: number;
  idProcesso: number;
  tipoDocumento: string;
  nomeArquivo: string;
  contentType: string | null;
  tamanhoBytes: number;
  incluirNaDuimp: boolean;
  dataUpload: string;
}
