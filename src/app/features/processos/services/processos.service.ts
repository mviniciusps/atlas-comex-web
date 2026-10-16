import { Injectable } from '@angular/core';
import {
  ItemDuimp,
  SituacaoDuimp,
} from '../../duimp/models/duimp.model';

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
  unidadeDespacho: string;
  moedaNegociacao: string;
  valorAduaneiro: number | null;
  itensDuimp: ItemDuimp[];
}

@Injectable({
  providedIn: 'root'
})
export class ProcessosService {
  private processos: Processo[] = [
    {
      numero: 'IMP-2026-001',
      importador: 'Empresa Exemplo Ltda.',
      modalidade: 'Marítimo',
      conhecimento: 'BL MSCU1234567',
      chegada: '18/10/2026',
      etapa: 'Conferência de carga',
      status: 'Em andamento',
      statusClass: 'andamento',
      portoOrigem: '',
      portoDestino: '',
      numeroMercante: '',
      presencaCarga: 'Pendente',
      numeroDuimp: '',
  situacaoDuimp: 'Não iniciada',
      unidadeDespacho: '',
      moedaNegociacao: '',
      valorAduaneiro: null,
      itensDuimp: []
    },
    {
      numero: 'IMP-2026-002',
      importador: 'Comercial Sul S.A.',
      modalidade: 'Aéreo',
      conhecimento: 'MAWB 123-45678901',
      chegada: '20/10/2026',
      etapa: 'Aguardando documentos',
      status: 'Pendente',
      statusClass: 'pendente',
      portoOrigem: '',
      portoDestino: '',
      numeroMercante: '',
      presencaCarga: 'Pendente',
      numeroDuimp: '',
  situacaoDuimp: 'Não iniciada',
      unidadeDespacho: '',
      moedaNegociacao: '',
      valorAduaneiro: null,
      itensDuimp: []
    },
    {
      numero: 'IMP-2026-003',
      importador: 'Indústria Horizonte Ltda.',
      modalidade: 'Marítimo',
      conhecimento: 'BL HLCU7654321',
      chegada: '22/10/2026',
      etapa: 'Preenchimento da DUIMP',
      status: 'Em andamento',
      statusClass: 'andamento',
      portoOrigem: '',
      portoDestino: '',
      numeroMercante: '',
      presencaCarga: 'Pendente',
      numeroDuimp: '',
  situacaoDuimp: 'Não iniciada',
      unidadeDespacho: '',
      moedaNegociacao: '',
      valorAduaneiro: null,
      itensDuimp: []
    },
  ];

  listar(): Processo[] {
    return this.processos;
  }

  buscarPorNumero(numero: string): Processo | undefined {
    return this.processos.find((processo) => processo.numero === numero);
  }

  adicionar(processo: Processo): void {
    this.processos = [processo, ...this.processos];
  }

  atualizarDadosCarga(
    numero: string,
    dados: Pick<
      Processo,
      'portoOrigem' | 'portoDestino' | 'numeroMercante' | 'presencaCarga'
    >,
  ): void {
    this.processos = this.processos.map((processo) =>
      processo.numero === numero
        ? { ...processo, ...dados }
        : processo,
    );
  }

  atualizarDadosDuimp(
    numero: string,
    dados: Pick<
      Processo,
      | 'numeroDuimp'
      | 'situacaoDuimp'
      | 'unidadeDespacho'
      | 'moedaNegociacao'
      | 'valorAduaneiro'
    >,
  ): void {
    this.processos = this.processos.map((processo) =>
      processo.numero === numero
        ? { ...processo, ...dados }
        : processo,
    );
  }

  atualizarItensDuimp(numero: string, itens: ItemDuimp[]): void {
    this.processos = this.processos.map((processo) =>
      processo.numero === numero
        ? { ...processo, itensDuimp: itens }
        : processo,
    );
  }
}
