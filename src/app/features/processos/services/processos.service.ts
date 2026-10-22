import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { SituacaoDuimp } from '../../duimp/models/duimp.model';
import type {
  ProcessoApiDto,
  ProcessoCriacaoDto,
} from '../models/processo-api.model';
import type { Processo } from '../models/processo.model';

@Injectable({
  providedIn: 'root',
})
export class ProcessosService {
  private processos: Processo[] = [];

  constructor(private readonly http: HttpClient) {}

  carregar(): Observable<Processo[]> {
    return this.http.get<ProcessoApiDto[]>(`${environment.apiBaseUrl}/processos`).pipe(
      map((dados) => dados.map((dado) => this.converterProcessoApi(dado))),
      tap((processos) => {
        this.processos = processos;
      }),
    );
  }

  criar(dados: ProcessoCriacaoDto): Observable<Processo> {
    return this.http
      .post<ProcessoApiDto>(`${environment.apiBaseUrl}/processos`, dados)
      .pipe(
        map((processoApi) => this.converterProcessoApi(processoApi)),
        tap((processo) => {
          this.processos = [processo, ...this.processos];
        }),
      );
  }

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
      processo.numero === numero ? { ...processo, ...dados } : processo,
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

  private converterProcessoApi(dado: ProcessoApiDto): Processo {
    const status = dado.situacao?.trim() || 'Pendente';
    const statusNormalizado = status.toLocaleLowerCase('pt-BR');
    const situacaoDuimp: SituacaoDuimp = dado.duimp
      ? 'Em preenchimento'
      : 'Não iniciada';

    return {
      idProcesso: dado.idProcesso,
      idImportador: dado.idImportador,
      idEstabelecimento: dado.idEstabelecimento,
      numero: dado.numeroProcesso,
      importador:
        dado.razaoSocialImportador?.trim() || 'Importador não identificado',
      modalidade: dado.modal ?? '',
      conhecimento: dado.conhecimentoHouse || dado.conhecimentoMaster || '',
      chegada: dado.chegada ?? '',
      etapa: 'Cadastro inicial',
      status,
      statusClass:
        statusNormalizado.includes('pendente') ||
          statusNormalizado.includes('aguardando')
          ? 'pendente'
          : 'andamento',
      portoOrigem: '',
      portoDestino: '',
      numeroMercante: dado.ceMercanteRuc ?? '',
      presencaCarga: 'Pendente',
      numeroDuimp: dado.duimp ?? '',
      situacaoDuimp,
      referenciaCliente: dado.referenciaCliente ?? '',
      previsaoChegada: dado.previsaoChegada ?? '',
      exportador: dado.exportador ?? '',
      observacoes: dado.observacoes ?? '',
      cnpjImportador: dado.cnpj,
      conhecimentoMaster: dado.conhecimentoMaster ?? '',
      conhecimentoHouse: dado.conhecimentoHouse ?? '',
      ceMercanteRuc: dado.ceMercanteRuc ?? '',
      dataRegistroDuimp: dado.dataRegistro ?? '',
      dataDesembaraco: dado.desembaraco ?? '',
      recintoAlfandegado: dado.recintoAlfandegado ?? '',
    };
  }
}
