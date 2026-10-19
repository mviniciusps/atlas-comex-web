import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  processoSelecionado: string | null = null;
  clienteSelecionado: string | null = null;
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
    private router: Router
  ) { }

  abrirFormulario(): void {
    this.formularioAberto = true;
  }

  //Se o processo clicado já estava selecionado, ele é desmarcado e vice e versa
  selecionarProcesso(numero: string): void {
    this.processoSelecionado = this.processoSelecionado === numero ? null : numero;
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

  anrirUploadProcesso(): void {
    if (!this.processoSelecionado) {
      return;
    }

    void this.router.navigate(
      ['/processos', this.processoSelecionado],
      { fragment: 'documentos' },
    )
  }

  abrirDuimpProcesso(): void {
    if (!this.processoSelecionado) {
      return;
    }

    void this.router.navigate([
      '/processos',
      this.processoSelecionado,
      'duimp',
    ]);
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

    // Abre a aba do importador do processo recém-criado.
    this.clienteSelecionado = importador.trim();
    this.processoSelecionado = null;

    this.historicoProcessoService.registrar(
      numero.trim(),
      'Processo criado: ' + numero.trim(),
    );

    this.cancelarFormulario();
  }

  get processos(): Processo[] {
    return this.processosService.listar();
  }

  get clientesImportadores(): string[] {
    // Cria uma aba única para cada importador cadastrado.
    return [
      ...new Set(
        this.processos
          .map((processo) => processo.importador.trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get clienteAtivo(): string {
    // Na primeira abertura, seleciona automaticamente o primeiro importador.
    return this.clienteSelecionado ?? this.clientesImportadores[0] ?? 'Clientes';
  }

  get processosDoCliente(): Processo[] {
    // Aplica a busca ao conjunto de processos do importador ativo.
    return this.processosFiltrados.filter(
      (processo) => processo.importador === this.clienteAtivo,
    );
  }

  selecionarCliente(cliente: string): void {
    this.clienteSelecionado = cliente;
    this.processoSelecionado = null;
  }

  get processosFiltrados() {
    const termo = this.termoBusca.trim().toLowerCase();

    //Se o campo busca estiver vazio, retorne todos processos
    if (!termo) {
      return this.processos;
    }

    //Se estiver preechido, pequise nas propriedades o valor digitado
    return this.processos.filter((processo) =>
      [
        processo.numero,
        processo.referenciaCliente,
        processo.previsaoChegada,
        processo.chegada,
        processo.exportador,
        processo.observacoes,
        processo.cnpjImportador,
        processo.conhecimentoMaster,
        processo.conhecimentoHouse,
        processo.modalidade,
        processo.ceMercanteRuc,
        processo.numeroDuimp,
        processo.dataRegistroDuimp,
        processo.dataDesembaraco,
        processo.recintoAlfandegado,
        processo.importador,
      ]
        .join(' ') //transforma toda propriedade em linha unica
        .toLowerCase() //tudo em letra minuscula
        .includes(termo), //O termo que o usuário digitou está contido em algum lugar desse texto
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
