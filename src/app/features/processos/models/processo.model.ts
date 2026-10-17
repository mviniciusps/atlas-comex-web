import type { SituacaoDuimp } from '../../duimp/models/duimp.model';


//Colunas do grid principal
export interface Processo {
  numero: string;
  importador: string;
  modalidade: string;
  conhecimento: string;
  chegada: string;
  etapa: string;
  status: string;
  statusClass: string;
  portoOrigem: string;
  portoDestino: string;
  numeroMercante: string;
  presencaCarga: 'Pendente' | 'Confirmada' | 'Divergente';
  numeroDuimp: string;
  situacaoDuimp: SituacaoDuimp;
  referenciaCliente?: string;
  previsaoChegada?: string;
  exportador?: string;
  observacoes?: string;
  cnpjImportador?: string;
  conhecimentoMaster?: string;
  conhecimentoHouse?: string;
  ceMercanteRuc?: string;
  dataRegistroDuimp?: string;
  dataDesembaraco?: string;
  recintoAlfandegado?: string;
}
