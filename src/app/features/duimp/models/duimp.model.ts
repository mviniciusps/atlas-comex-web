export type SituacaoDuimp =
  | 'Não iniciada'
  | 'Em preenchimento'
  | 'Pronta para revisão';

export type TipoPessoaImportador = 'Pessoa Física' | 'Pessoa Jurídica';

export interface ComponenteFrete {
  id: number;
  pagamento: string;
  tipo: string;
  moeda: string;
  valor: number | null;
}

export interface EmbalagemCarga {
  id: number;
  item: string;
  tipo: string;
  quantidade: number | null;
}

export interface DadosCargaDuimp {
  unidadesDespacho: string[];
  numeroCe: string;
  numeroRuc: string;
  localEmbarque: string;
  dataConhecimento: string;
  paisProcedencia: string;
  pesoBruto: number | null;
  pesoLiquido: number | null;
  componentesFrete: ComponenteFrete[];
  moedaFrete: string;
  valorFreteMoeda: number | null;
  valorFreteReais: number | null;
  valorAfrmmTum: number | null;
  afrmmTumPago: boolean | null;
  moedaSeguro: string;
  valorSeguroMoeda: number | null;
  valorSeguroReais: number | null;
  embalagens: EmbalagemCarga[];
}

export interface ItemDuimp {
  id: number;
  descricaoMercadoria: string;
  ncm: string;
  quantidade: number | null;
  unidadeMedida: string;
  valorUnitario: number | null;
  caracterizacaoImportacao?: string;
  versaoProduto?: string;
  paisOrigemFabricante?: string;
  codigoNomeFabricante?: string;
  versaoFabricante?: string;
  enderecoFabricante?: string;
  exportadorEhFabricante?: boolean | null;
  paisOrigemExportador?: string;
  codigoNomeExportador?: string;
  versaoExportador?: string;
  enderecoExportador?: string;
  ufsConsumo?: string;
  municipiosConsumo?: string;
  aplicacao?: string;
  condicaoMercadoria?: 'Nova' | 'Usada';
  unidadeEstatistica?: string;
  quantidadeEstatistica?: number | null;
  pesoLiquido?: number | null;
  unidadeComercializada?: string;
  quantidadeComercializada?: number | null;
  moedaNegociada?: string;
  valorUnitarioCondicaoVenda?: number | null;
  numeroSerie?: string;
  detalhamentoProduto?: string;
  metodoValoracao?: string;
  incoterm?: string;
  coberturaCambial?: string;
}

export interface Duimp {
  processoNumero: string;
  numeroDuimp: string;
  situacaoDuimp: SituacaoDuimp;
  unidadeDespacho: string;
  moedaNegociacao: string;
  valorAduaneiro: number | null;
  itens: ItemDuimp[];
  tipoPessoaImportador: TipoPessoaImportador;
  cpfCnpjImportador: string;
  nomeImportador: string;
  enderecoImportador: string;
  municipioImportador: string;
  ufImportador: string;
  complementoEnderecoImportador: string;
  informacoesComplementaresVariaveis: string;
  usarTextoPadrao: boolean;
  textoPadrao: string;
  carga: DadosCargaDuimp;
  contaDebito: string;
}
