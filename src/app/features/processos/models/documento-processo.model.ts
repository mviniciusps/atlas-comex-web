export type TipoDocumento =
  | 'Invoice'
  | 'Packing List'
  | 'Conhecimento de carga'
  | 'Certificado'
  | 'Outro';

export type StatusConferenciaDocumento =
  | 'Aguardando conferência'
  | 'Conferido'
  | 'Com divergência';

export interface DocumentoProcesso {
  idDocumento: number;
  idProcesso: number;
  tipoDocumento: string;
  nomeArquivo: string;
  contentType: string | null;
  tamanhoBytes: number;
  incluirNaDuimp: boolean;
  dataUpload: string;
  statusConferencia: StatusConferenciaDocumento;
}
