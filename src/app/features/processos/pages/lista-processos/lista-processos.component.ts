import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ImportadorApiDto } from '../../models/importador-api.model';
import type { Processo } from '../../models/processo.model';
import { HistoricoProcessoService } from '../../services/historico-processo.service';
import { ImportadoresService } from '../../services/importadores.service';
import { ProcessosService } from '../../services/processos.service';

@Component({
  selector: 'app-lista-processos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './lista-processos.component.html',
  styleUrl: './lista-processos.component.scss',
})
export class ListaProcessosComponent implements OnInit {
  mensagemErro = '';
  mensagemErroProcessos = '';
  mensagemErroImportadores = '';
  termoBusca = '';
  processoSelecionado: string | null = null;
  clienteSelecionado: string | null = null;
  formularioAberto = false;
  carregandoProcessos = false;
  carregandoImportadores = false;
  salvandoProcesso = false;

  importadores: ImportadorApiDto[] = [];

  novoProcesso = {
    numero: '',
    idEstabelecimento: null as number | null,
    referenciaCliente: '',
    previsaoChegada: '',
  };

  constructor(
    private readonly processosService: ProcessosService,
    private readonly historicoProcessoService: HistoricoProcessoService,
    @Inject(ImportadoresService)
    private readonly importadoresService: ImportadoresService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.carregandoProcessos = true;
    this.processosService.carregar().subscribe({
      next: (processos) => {
        this.clienteSelecionado = processos[0]?.importador ?? null;
        this.carregandoProcessos = false;
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar processos da API:', erro);
        this.mensagemErroProcessos =
          'Não foi possível carregar os processos. Verifique se a API está em execução.';
        this.carregandoProcessos = false;
      },
    });

    this.carregandoImportadores = true;
    this.importadoresService.listar().subscribe({
      next: (importadores) => {
        this.importadores = importadores;
        this.carregandoImportadores = false;
      },
      error: (erro: unknown) => {
        console.error('Erro ao carregar importadores:', erro);
        this.mensagemErroImportadores =
          'Não foi possível carregar os importadores. Verifique se a API está em execução.';
        this.carregandoImportadores = false;
      },
    });
  }

  abrirFormulario(): void {
    this.mensagemErro = '';
    this.formularioAberto = true;
  }

  selecionarProcesso(numero: string): void {
    this.processoSelecionado =
      this.processoSelecionado === numero ? null : numero;
  }

  cancelarFormulario(): void {
    this.formularioAberto = false;
    this.mensagemErro = '';
    this.novoProcesso = {
      numero: '',
      idEstabelecimento: null,
      referenciaCliente: '',
      previsaoChegada: '',
    };
  }

  abrirUploadProcesso(): void {
    if (!this.processoSelecionado) {
      return;
    }

    void this.router.navigate(
      ['/processos', this.processoSelecionado],
      { fragment: 'documentos' },
    );
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
    if (this.salvandoProcesso) {
      return;
    }

    const {
      numero,
      idEstabelecimento,
      referenciaCliente,
      previsaoChegada,
    } = this.novoProcesso;
    const numeroNormalizado = numero.trim();

    if (!numeroNormalizado || idEstabelecimento === null) {
      this.mensagemErro =
        'Informe o número do processo e selecione um estabelecimento.';
      return;
    }

    if (this.processosService.buscarPorNumero(numeroNormalizado)) {
      this.mensagemErro = 'Já existe um processo com esse número.';
      return;
    }

    this.mensagemErro = '';
    this.salvandoProcesso = true;

    this.processosService
      .criar({
        idEstabelecimento,
        numeroProcesso: numeroNormalizado,
        referenciaCliente: referenciaCliente.trim() || null,
        previsaoChegada: previsaoChegada || null,
        situacao: 'Aguardando documentos',
      })
      .subscribe({
        next: (processo) => {
          this.clienteSelecionado = processo.importador;
          this.processoSelecionado = null;

          this.historicoProcessoService.registrar(
            processo.numero,
            'Processo criado: ' + processo.numero,
          );

          this.salvandoProcesso = false;
          this.cancelarFormulario();
        },
        error: (erro: unknown) => {
          console.error('Erro ao salvar processo:', erro);
          this.mensagemErro =
            'Não foi possível salvar o processo. Confira os dados e tente novamente.';
          this.salvandoProcesso = false;
        },
      });
  }

  get processos(): Processo[] {
    return this.processosService.listar();
  }

  get clientesImportadores(): string[] {
    return [
      ...new Set(
        this.processos
          .map(
            (processo) =>
              processo.importador?.trim() || 'Importador não identificado',
          )
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get clienteAtivo(): string {
    return this.clienteSelecionado ?? this.clientesImportadores[0] ?? 'Clientes';
  }

  get processosDoCliente(): Processo[] {
    return this.processosFiltrados.filter(
      (processo) =>
        (processo.importador?.trim() || 'Importador não identificado') ===
        this.clienteAtivo,
    );
  }

  selecionarCliente(cliente: string): void {
    this.clienteSelecionado = cliente;
    this.processoSelecionado = null;
  }

  get processosFiltrados(): Processo[] {
    const termo = this.termoBusca.trim().toLowerCase();

    if (!termo) {
      return this.processos;
    }

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
