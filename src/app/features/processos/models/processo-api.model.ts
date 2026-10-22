export interface ProcessoApiDto {
  idProcesso: number;
  idImportador: number;
  razaoSocialImportador?: string | null;
  idEstabelecimento: number;
  cnpj: string;
  numeroProcesso: string;
  referenciaCliente: string | null;
  previsaoChegada: string | null;
  chegada: string | null;
  exportador: string | null;
  observacoes: string | null;
  conhecimentoMaster: string | null;
  conhecimentoHouse: string | null;
  modal: string | null;
  ceMercanteRuc: string | null;
  duimp: string | null;
  dataRegistro: string | null;
  desembaraco: string | null;
  recintoAlfandegado: string | null;
  situacao: string | null;
}

export interface ProcessoCriacaoDto {
  idEstabelecimento: number;
  numeroProcesso: string;
  referenciaCliente: string | null;
  previsaoChegada: string | null;
  situacao: string;
}

//Corpo do JSON PUT /api/processos/{idProcesso}, campos editaveis do grid, estão de fora campos automáticos
export interface ProcessoAtualizacaoDadosDto {
  referenciaCliente: string | null;
  previsaoChegada: string | null;
  exportador: string | null;
  observacoes: string | null;
  conhecimentoMaster: string | null;
  conhecimentoHouse: string | null;
  modal: string | null;
  desembaraco: string | null;
  recintoAlfandegado: string | null;
}

export interface ProcessoAtualizacaoDto {
  dados: ProcessoAtualizacaoDadosDto;
}
