import { Injectable } from '@angular/core';
import type { SituacaoDuimp } from '../../duimp/models/duimp.model';
import type { Processo } from '../models/processo.model';

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
      referenciaCliente: 'EXP-4582',
      previsaoChegada: '22/10/2026',
      exportador: 'Northstar Equipment Co.',
      observacoes: 'Aguardando validação documental',
      cnpjImportador: '12.345.678/0001-90',
      conhecimentoMaster: 'MSCU1234567',
      conhecimentoHouse: 'MSCUH2026044',
      ceMercanteRuc: '202612345678901',
      dataRegistroDuimp: '',
      dataDesembaraco: '',
      recintoAlfandegado: '',
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
      referenciaCliente: 'EXP-4600',
      previsaoChegada: '20/10/2026',
      exportador: '',
      observacoes: 'Cobrar invoice atualizada',
      cnpjImportador: '23.450.789/0001-01',
      conhecimentoMaster: 'MAWB 123-45678901',
      conhecimentoHouse: 'HAWB 88765432',
      ceMercanteRuc: '',
      dataRegistroDuimp: '',
      dataDesembaraco: '',
      recintoAlfandegado: '',
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
      referenciaCliente: 'EXP-4617',
      previsaoChegada: '25/10/2026',
      exportador: '',
      observacoes: 'Confirmar entrega no terminal',
      cnpjImportador: '34.567.890/0001-12',
      conhecimentoMaster: 'HLCU7654321',
      conhecimentoHouse: 'HLCU7654321-01',
      ceMercanteRuc: '',
      dataRegistroDuimp: '',
      dataDesembaraco: '',
      recintoAlfandegado: '',
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

  atualizarResumoDuimp(
    numero: string,
    numeroDuimp: string,
    situacaoDuimp: SituacaoDuimp,
  ): void {
    this.processos = this.processos.map((processo) =>
      processo.numero === numero
        ? { ...processo, numeroDuimp, situacaoDuimp }
        : processo,
    );
  }
}
