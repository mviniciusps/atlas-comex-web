import { Injectable } from '@angular/core';

export interface Processo {
  numero: string;
  importador: string;
  modalidade: string;
  conhecimento: string;
  chegada: string;
  etapa: string;
  status: string;
  statusClass: string;
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

}
