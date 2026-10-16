export type SituacaoDuimp =
  | 'Não iniciada'
  | 'Em preenchimento'
  | 'Pronta para revisão';

export interface ItemDuimp {
  id: number;
  descricaoMercadoria: string;
  ncm: string;
  quantidade: number | null;
  unidadeMedida: string;
  valorUnitario: number | null;
}

export interface Duimp {
  processoNumero: string;
  numeroDuimp: string;
  situacaoDuimp: SituacaoDuimp;
  unidadeDespacho: string;
  moedaNegociacao: string;
  valorAduaneiro: number | null;
  itens: ItemDuimp[];
}
