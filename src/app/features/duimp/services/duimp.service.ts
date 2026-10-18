import { Injectable } from '@angular/core';
import { Duimp, ItemDuimp } from '../models/duimp.model';
import { ProcessosService } from '../../processos/services/processos.service';

@Injectable({
  providedIn: 'root',
})
export class DuimpService {
  private duimps: Duimp[] = [];

  constructor(private processosService: ProcessosService) { }

  buscarPorProcesso(processoNumero: string): Duimp | undefined {
    return this.duimps.find(
      (duimp) => duimp.processoNumero === processoNumero,
    );
  }

  obterOuCriar(processoNumero: string): Duimp {
    const duimpExistente = this.buscarPorProcesso(processoNumero);

    if (duimpExistente) {
      return duimpExistente;
    }

    const processo = this.processosService.buscarPorNumero(processoNumero);

    const novaDuimp: Duimp = {
      processoNumero,
      numeroDuimp: processo?.numeroDuimp ?? '',
      situacaoDuimp: processo?.situacaoDuimp ?? 'Não iniciada',
      unidadeDespacho: '',
      moedaNegociacao: '',
      valorAduaneiro: null,
      itens: [],
      tipoPessoaImportador: 'Pessoa Jurídica',
      cpfCnpjImportador: processo?.cnpjImportador ?? '',
      nomeImportador: processo?.importador ?? '',
      enderecoImportador: '',
      municipioImportador: '',
      ufImportador: '',
      complementoEnderecoImportador: '',
      informacoesComplementaresVariaveis: '',
      usarTextoPadrao: false,
      textoPadrao: '',
      carga: {
        unidadesDespacho: processo?.recintoAlfandegado
          ? [processo.recintoAlfandegado]
          : [],
        numeroCe: processo?.ceMercanteRuc ?? '',
        numeroRuc: processo?.ceMercanteRuc ?? '',
        localEmbarque: '',
        dataConhecimento: '',
        paisProcedencia: '',
        pesoBruto: null,
        pesoLiquido: null,
        componentesFrete: [],
        moedaFrete: '',
        valorFreteMoeda: null,
        valorFreteReais: null,
        valorAfrmmTum: null,
        afrmmTumPago: null,
        moedaSeguro: '',
        valorSeguroMoeda: null,
        valorSeguroReais: null,
        embalagens: [],
      },
      contaDebito: '',
    };

    this.duimps = [...this.duimps, novaDuimp];

    return novaDuimp;
  }

  salvar(duimpAtualizada: Duimp): void {
    const duimpExiste = this.buscarPorProcesso(
      duimpAtualizada.processoNumero,
    );

    if (duimpExiste) {
      this.duimps = this.duimps.map((duimp) =>
        duimp.processoNumero === duimpAtualizada.processoNumero
          ? duimpAtualizada
          : duimp,
      );
    } else {
      this.duimps = [...this.duimps, duimpAtualizada];
    }

    this.processosService.atualizarResumoDuimp(
      duimpAtualizada.processoNumero,
      duimpAtualizada.numeroDuimp,
      duimpAtualizada.situacaoDuimp,
    );
  }

  atualizarItens(processoNumero: string, itens: ItemDuimp[]): void {
    const duimp = this.obterOuCriar(processoNumero);

    this.salvar({
      ...duimp,
      itens,
    });
  }
}
