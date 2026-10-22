export interface ImportadorApiDto {
  idImportador: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  estabelecimentos: EstabelecimentoImportadorApiDto[];
}

export interface EstabelecimentoImportadorApiDto {
  idEstabelecimento: number;
  cnpj: string;
  nomeEstabelecimento: string;
}
