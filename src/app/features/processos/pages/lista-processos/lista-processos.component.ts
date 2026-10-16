import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Processo } from '../../models/processo.model';
import { ProcessosService } from '../../services/processos.service';
import { HistoricoProcessoService } from '../../services/historico-processo.service';

@Component({
  selector: 'app-lista-processos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './lista-processos.component.html',
  styleUrl: './lista-processos.component.scss'
})

export class ListaProcessosComponent {

  mensagemErro = '';
  termoBusca = '';
  formularioAberto = false;

  novoProcesso = {
    numero: '',
    importador: '',
    modalidade: 'Marítimo',
    conhecimento: '',
    chegada: '',
  }

  constructor(
    private processosService: ProcessosService,
    private historicoProcessoService: HistoricoProcessoService,
  ) { }

  abrirFormulario(): void {
    this.formularioAberto = true;
  }

  cancelarFormulario(): void {
    this.formularioAberto = false;
    this.novoProcesso = {
      numero: '',
      importador: '',
      modalidade: 'Marítimo',
      conhecimento: '',
      chegada: '',
    }
  }

  adicionarProcesso(): void {
    const { numero, importador, conhecimento, chegada, modalidade } = this.novoProcesso;

    if (!numero.trim() || !importador.trim()) {
      return;
    }

    this.mensagemErro = '';

    if (this.processosService.buscarPorNumero(numero.trim())) {
      this.mensagemErro = 'Já existe um processo com esse número.';
      return;
    }

    this.processosService.adicionar(
      {
        numero: numero.trim(),
        importador: importador.trim(),
        modalidade,
        conhecimento: conhecimento.trim(),
        chegada,
        etapa: 'Cadastro inicial',
        status: 'Em andamento',
        statusClass: 'andamento',
        portoOrigem: '',
        portoDestino: '',
        numeroMercante: '',
        presencaCarga: 'Pendente',
        numeroDuimp: '',
        situacaoDuimp: 'Não iniciada',
      });

    this.historicoProcessoService.registrar(
      numero.trim(),
      'Processo criado: ' + numero.trim(),
    );

    this.cancelarFormulario();
  }

  get processos(): Processo[] {
    return this.processosService.listar();
  }

  get processosFiltrados() {
    const termo = this.termoBusca.trim().toLowerCase();

    if (!termo) {
      return this.processos;
    }

    return this.processos.filter((processo) =>
      [
        processo.numero,
        processo.importador,
        processo.modalidade,
        processo.conhecimento,
        processo.chegada,
        processo.etapa,
        processo.status,
        processo.portoOrigem,
        processo.portoDestino,
        processo.numeroMercante,
        processo.presencaCarga,
        processo.numeroDuimp,
        processo.situacaoDuimp,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }

  get totalProcessos(): number {
    return this.processos.length;
  }

  get processosAguardandoDocumentos(): number {
    return this.processos.filter(
      (processo) => processo.status === 'Pendente',
    ).length;
  }

  get chegadasPrevistas(): number {
    return this.processos.filter((processo) => processo.chegada !== '').length;
  }

}
