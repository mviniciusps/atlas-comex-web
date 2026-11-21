export interface ImportadorApiDto {
  idImportador: number;
  razaoSocial: string;
  estabelecimentos: EstabelecimentoImportadorApiDto[];
}

export interface EstabelecimentoImportadorApiDto {
  idEstabelecimento: number;
  cnpj: string;
}

export interface ImportadorCadastroDto {
  razaoSocial: string;
  estabelecimentos: EstabelecimentoImportadorCadastroDto[];
}


export interface EstabelecimentoImportadorCadastroDto {
  cnpj: string;
  logradouro: string | null;
  numeroEndereco: string | null;
  complementoEndereco: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
}

export interface ImportadorCriadoApiDto {
  idImportador: number;
}

export interface ImportadorCnpjConsultaApiDto {
  cnpj: string;
  razaoSocial: string;
  logradouro: string | null;
  numeroEndereco: string | null;
  complementoEndereco: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
}
