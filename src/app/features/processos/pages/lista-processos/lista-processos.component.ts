import { Component, OnInit } from '@angular/core';
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

export class ListaProcessosComponent implements OnInit {

  // Estado da tela: mensagens, busca, seleção, importador ativo e formulário.
  mensagemErro = '';
  termoBusca = '';
  processoSelecionado: string | null = null;
  clienteSelecionado: string | null = null;
  formularioAberto = false;

  // Valores ligados ao formulário de cadastro; são limpos ao cancelar ou salvar.
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

  ngOnInit(): void {
    this.processosService.carregar().subscribe({
      next: (processos) => {
        // Seleciona inicialmente o importador do primeiro processo carregado.
        this.clienteSelecionado = processos[0]?.importador ?? null;
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar processos da API:', erro);
        this.mensagemErro = 'Não foi possível carregar os processos. Verifique se a API está em execução.';
      },
    });

  }

  // Abre o formulário de cadastro de um novo processo.
  abrirFormulario(): void {
    this.formularioAberto = true;
  }

  //Se o processo clicado já estava selecionado, ele é desmarcado e vice e versa
  selecionarProcesso(numero: string): void {
    this.processoSelecionado = this.processoSelecionado === numero ? null : numero;
  }

  // Fecha o formulário e restaura os campos para um novo cadastro.
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

  // Abre a área de documentos do processo selecionado.
  anrirUploadProcesso(): void {
    if (!this.processoSelecionado) {
      return;
    }

    void this.router.navigate(
      ['/processos', this.processoSelecionado],
      { fragment: 'documentos' },
    )
  }

  // Abre o módulo DUIMP do processo selecionado.
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

  // Valida e cadastra o processo, seleciona seu importador e registra o histórico.
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

  // Obtém a lista compartilhada mantida pelo serviço em memória.
  get processos(): Processo[] {
    return this.processosService.listar();
  }

  // Gera uma aba única para cada importador que possui processos cadastrados.
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

  // Usa o importador selecionado ou, na primeira abertura, o primeiro da lista.
  get clienteAtivo(): string {
    // Na primeira abertura, seleciona automaticamente o primeiro importador.
    return this.clienteSelecionado ?? this.clientesImportadores[0] ?? 'Clientes';
  }

  // Combina a busca textual com o importador ativo para montar o grid.
  get processosDoCliente(): Processo[] {
    // Aplica a busca ao conjunto de processos do importador ativo.
    return this.processosFiltrados.filter(
      (processo) => processo.importador === this.clienteAtivo,
    );
  }

  // Troca de cliente e limpa a seleção antiga para evitar ações no processo errado.
  selecionarCliente(cliente: string): void {
    this.clienteSelecionado = cliente;
    this.processoSelecionado = null;
  }

  // Procura o termo digitado nas propriedades relevantes de cada processo.
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

  // Indicadores auxiliares de quantidade e situação dos processos.
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
