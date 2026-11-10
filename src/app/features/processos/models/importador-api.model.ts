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

export interface ImportadorCadastroDto {
  razaoSocial: string;
  nomeFantasia: string | null;
  estabelecimentos: EstabelecimentoImportadorCadastroDto[];
}

export interface EstabelecimentoImportadorCadastroDto {
  cnpj: string;
  nomeEstabelecimento: string | null;
}

export interface ImportadorCriadoApiDto {
  idImportador: number;
}
