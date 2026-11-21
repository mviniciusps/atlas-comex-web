import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type {
  ImportadorApiDto,
  ImportadorCadastroDto,
  ImportadorCnpjConsultaApiDto,
} from '../../models/importador-api.model';
import type { ProcessoAtualizacaoDadosDto } from '../../models/processo-api.model';
import type { Processo } from '../../models/processo.model';
import { HistoricoProcessoService } from '../../services/historico-processo.service';
import { ImportadoresService } from '../../services/importadores.service';
import { ProcessosService } from '../../services/processos.service';
import { catchError, forkJoin, map, of } from 'rxjs';

// Campos que podem ser ordenados no grid principal.
type CampoOrdenacaoProcesso =
  | 'numero'
  | 'referenciaCliente'
  | 'previsaoChegada'
  | 'chegada'
  | 'exportador'
  | 'observacoes'
  | 'cnpjImportador'
  | 'conhecimentoMaster'
  | 'conhecimentoHouse'
  | 'modalidade'
  | 'ceMercanteRuc'
  | 'numeroDuimp'
  | 'dataRegistroDuimp'
  | 'dataDesembaraco'
  | 'recintoAlfandegado';

@Component({
  selector: 'app-lista-processos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './lista-processos.component.html',
  styleUrl: './lista-processos.component.scss',
})

export class ListaProcessosComponent implements OnInit {
  readonly anoAtual = new Date().getFullYear();

  mensagemErro = '';
  mensagemErroProcessos = '';
  mensagemErroImportadores = '';
  mensagemErroAtualizacao = '';
  termoBusca = '';
  campoOrdenacao: CampoOrdenacaoProcesso | null = null;
  direcaoOrdenacao: 'asc' | 'desc' = 'asc';
  processoSelecionado: string | null = null;
  clienteSelecionado: string | null = null;
  formularioAberto = false;
  carregandoProcessos = false;
  carregandoImportadores = false;
  salvandoProcesso = false;
  cadastroImportadorAberto = false;
  salvandoImportador = false;
  mensagemErroCadastroImportador = '';
  mensagemSucessoImportador = '';
  consultandoCnpj = false;
  dadosCnpjConsultados = false;
  editandoDadosImportador = false;
  private ultimoCnpjConsultado = '';

  importadores: ImportadorApiDto[] = [];

  // Identifica o que realmente mudou na tela (grid).
  private readonly dadosOriginais = new Map<
    number,
    ProcessoAtualizacaoDadosDto
  >();

  readonly alteracoesPendentes = new Map<
    number,
    ProcessoAtualizacaoDadosDto
  >();

  salvandoAlteracoes = false;

  novoProcesso = {
    numero: '',
    idEstabelecimento: null as number | null,
    referenciaCliente: '',
    previsaoChegada: '',
  };

  novoImportador = {
    razaoSocial: '',
    cnpj: '',
    logradouro: '',
    numeroEndereco: '',
    complementoEndereco: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
  };

  constructor(
    private readonly processosService: ProcessosService,
    private readonly historicoProcessoService: HistoricoProcessoService,
    @Inject(ImportadoresService)
    private readonly importadoresService: ImportadoresService,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {
    this.carregandoProcessos = true;
    this.processosService.carregar().subscribe({
      next: (processos) => {
        this.definirDadosOriginais(processos);
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
    this.mensagemSucessoImportador = '';
    this.formularioAberto = true;
  }

  abrirCadastroImportador(): void {
    this.limparNovoImportador();
    this.mensagemErroCadastroImportador = '';
    this.mensagemSucessoImportador = '';
    this.cadastroImportadorAberto = true;
  }

  atualizarCnpj(cnpjDigitado: string): void {
    this.novoImportador = {
      razaoSocial: '',
      cnpj: cnpjDigitado.toUpperCase(),
      logradouro: '',
      numeroEndereco: '',
      complementoEndereco: '',
      bairro: '',
      municipio: '',
      uf: '',
      cep: '',
    };

    this.ultimoCnpjConsultado = '';
    this.dadosCnpjConsultados = false;
    this.editandoDadosImportador = false;
    this.mensagemErroCadastroImportador = '';
  }

  private normalizarCnpj(cnpj: string): string {
    return cnpj.replace(/[^a-z0-9]/gi, '').toUpperCase();
  }

  consultarCnpj(): void {
    const cnpj = this.normalizarCnpj(this.novoImportador.cnpj);

    if (!cnpj) {
      return;
    }

    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) {
      this.mensagemErroCadastroImportador =
        'Informe 12 letras ou números seguidos de 2 dígitos no CNPJ.';
      return;
    }

    if (this.consultandoCnpj || cnpj === this.ultimoCnpjConsultado) {
      return;
    }

    this.consultandoCnpj = true;
    this.mensagemErroCadastroImportador = '';

    this.importadoresService.consultarCnpj(cnpj).subscribe({
      next: (dados: ImportadorCnpjConsultaApiDto) => {
        this.novoImportador = {
          cnpj: dados.cnpj,
          razaoSocial: dados.razaoSocial ?? '',
          logradouro: dados.logradouro ?? '',
          numeroEndereco: dados.numeroEndereco ?? '',
          complementoEndereco: dados.complementoEndereco ?? '',
          bairro: dados.bairro ?? '',
          municipio: dados.municipio ?? '',
          uf: dados.uf ?? '',
          cep: dados.cep ?? '',
        };

        this.ultimoCnpjConsultado = cnpj;
        this.dadosCnpjConsultados = true;
        this.editandoDadosImportador = false;
        this.consultandoCnpj = false;
      },
      error: (erro: unknown) => {
        this.dadosCnpjConsultados = false;
        this.editandoDadosImportador = true;
        this.consultandoCnpj = false;
        this.mensagemErroCadastroImportador =
          erro instanceof HttpErrorResponse && erro.status === 404
            ? 'CNPJ não encontrado. Você pode preencher os dados manualmente.'
            : 'Não foi possível consultar o CNPJ. Você pode preencher os dados manualmente.';
      },
    });
  }

  liberarEdicaoDadosImportador(): void {
    this.editandoDadosImportador = true;
  }

  cancelarCadastroImportador(): void {
    if (this.salvandoImportador) {
      return;
    }

    this.cadastroImportadorAberto = false;
    this.mensagemErroCadastroImportador = '';
    this.limparNovoImportador();
  }

  salvarImportador(): void {
    if (this.salvandoImportador) {
      return;
    }

    const razaoSocial = this.novoImportador.razaoSocial.trim();
    const cnpj = this.normalizarCnpj(this.novoImportador.cnpj);

    if (!razaoSocial) {
      this.mensagemErroCadastroImportador = 'Informe a razão social.';
      return;
    }

    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) {
      this.mensagemErroCadastroImportador =
        'Informe 12 letras ou números seguidos de 2 dígitos no CNPJ.';
      return;
    }

    const cnpjJaCadastrado = this.importadores.some((importador) =>
      importador.estabelecimentos.some(
        (estabelecimento) =>
          this.normalizarCnpj(estabelecimento.cnpj) === cnpj,
      ),
    );

    if (cnpjJaCadastrado) {
      this.mensagemErroCadastroImportador =
        'Já existe um estabelecimento cadastrado com este CNPJ.';
      return;
    }

    const dados: ImportadorCadastroDto = {
      razaoSocial,
      estabelecimentos: [
        {
          cnpj,
          logradouro: this.novoImportador.logradouro.trim() || null,
          numeroEndereco: this.novoImportador.numeroEndereco.trim() || null,
          complementoEndereco:
            this.novoImportador.complementoEndereco.trim() || null,
          bairro: this.novoImportador.bairro.trim() || null,
          municipio: this.novoImportador.municipio.trim() || null,
          uf: this.novoImportador.uf.trim().toUpperCase() || null,
          cep: this.novoImportador.cep.trim() || null,
        },
      ],
    };

    this.salvandoImportador = true;
    this.mensagemErroCadastroImportador = '';
    this.mensagemSucessoImportador = '';

    this.importadoresService.criar(dados).subscribe({
      next: (resultado) => {
        // Recarrega para receber os IDs de importador e estabelecimento gerados no banco.
        this.importadoresService.listar().subscribe({
          next: (importadores) => {
            this.importadores = importadores;
            const importadorCriado = importadores.find(
              (importador) => importador.idImportador === resultado.idImportador,
            );
            const estabelecimentoCriado =
              importadorCriado?.estabelecimentos[0];

            if (!estabelecimentoCriado) {
              this.mensagemErroCadastroImportador =
                'O importador foi criado, mas não foi possível localizar o estabelecimento retornado pela API.';
              this.salvandoImportador = false;
              return;
            }

            this.novoProcesso.idEstabelecimento =
              estabelecimentoCriado.idEstabelecimento;
            this.cadastroImportadorAberto = false;
            this.limparNovoImportador();
            this.mensagemSucessoImportador =
              'Importador cadastrado e estabelecimento selecionado.';
            this.salvandoImportador = false;
          },
          error: (erro: unknown) => {
            console.error('Importador criado, mas não foi possível atualizar a lista:', erro);
            this.mensagemErroCadastroImportador =
              'O importador foi criado, mas não foi possível atualizar a lista. Recarregue os importadores antes de continuar.';
            this.salvandoImportador = false;
          },
        });
      },
      error: (erro: unknown) => {
        console.error('Erro ao cadastrar importador:', erro);
        this.mensagemErroCadastroImportador =
          erro instanceof HttpErrorResponse && erro.status === 409
            ? 'Já existe um estabelecimento cadastrado com este CNPJ.'
            : 'Não foi possível cadastrar o importador. Confira os dados e tente novamente.';
        this.salvandoImportador = false;
      },
    });
  }

  private limparNovoImportador(): void {
    this.novoImportador = {
      razaoSocial: '',
      cnpj: '',
      logradouro: '',
      numeroEndereco: '',
      complementoEndereco: '',
      bairro: '',
      municipio: '',
      uf: '',
      cep: '',
    };

    this.consultandoCnpj = false;
    this.dadosCnpjConsultados = false;
    this.editandoDadosImportador = false;
    this.ultimoCnpjConsultado = '';
  }

  selecionarProcesso(numero: string): void {
    this.processoSelecionado =
      this.processoSelecionado === numero ? null : numero;
  }

  cancelarFormulario(): void {
    this.cadastroImportadorAberto = false;
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
          this.guardarDadosOriginais(processo);
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

  private definirDadosOriginais(processos: Processo[]): void {
    this.dadosOriginais.clear();
    this.alteracoesPendentes.clear();

    processos.forEach((processo) => this.guardarDadosOriginais(processo));
  }

  private guardarDadosOriginais(processo: Processo): void {
    if (processo.idProcesso == null) {
      return;
    }

    this.dadosOriginais.set(
      processo.idProcesso,
      this.montarDadosAtualizacao(processo),
    );
  }

  private montarDadosAtualizacao(
    processo: Processo,
  ): ProcessoAtualizacaoDadosDto {
    return {
      referenciaCliente: processo.referenciaCliente?.trim() || null,
      previsaoChegada: processo.previsaoChegada || null,
      exportador: processo.exportador?.trim() || null,
      observacoes: processo.observacoes?.trim() || null,
      conhecimentoMaster: processo.conhecimentoMaster?.trim() || null,
      conhecimentoHouse: processo.conhecimentoHouse?.trim() || null,
      modal: processo.modalidade || null,
      recintoAlfandegado: processo.recintoAlfandegado?.trim() || null,
    };
  }

  private dadosIguais(
    primeiro: ProcessoAtualizacaoDadosDto,
    segundo: ProcessoAtualizacaoDadosDto,
  ): boolean {
    return (
      primeiro.referenciaCliente === segundo.referenciaCliente &&
      primeiro.previsaoChegada === segundo.previsaoChegada &&
      primeiro.exportador === segundo.exportador &&
      primeiro.observacoes === segundo.observacoes &&
      primeiro.conhecimentoMaster === segundo.conhecimentoMaster &&
      primeiro.conhecimentoHouse === segundo.conhecimentoHouse &&
      primeiro.modal === segundo.modal &&
      primeiro.recintoAlfandegado === segundo.recintoAlfandegado
    );
  }

  registrarAlteracao(processo: Processo): void {
    if (processo.idProcesso == null) {
      return;
    }

    const dadosAtuais = this.montarDadosAtualizacao(processo);
    const dadosOriginais = this.dadosOriginais.get(processo.idProcesso);

    if (dadosOriginais && this.dadosIguais(dadosAtuais, dadosOriginais)) {
      this.alteracoesPendentes.delete(processo.idProcesso);
    } else {
      this.alteracoesPendentes.set(processo.idProcesso, dadosAtuais);
    }

    this.mensagemErroAtualizacao = '';
  }

  salvarAlteracoesPendentes(): void {
    if (this.salvandoAlteracoes || this.alteracoesPendentes.size === 0) {
      return;
    }

    this.salvandoAlteracoes = true;
    this.mensagemErroAtualizacao = '';

    const pendencias = Array.from(this.alteracoesPendentes.entries());

    // Envia um PUT por processo e aguarda todas as respostas.
    const requisicoes = pendencias.map(([idProcesso, dados]) => {
      const processo = this.processos.find(
        (item) => item.idProcesso === idProcesso
      );

      if (!processo) return of({ idProcesso, dados, sucesso: false });

      return this.processosService
        .atualizar(idProcesso, processo.status, dados)
        .pipe(
          map(() => ({ idProcesso, dados, sucesso: true })),
          catchError((erro: unknown) => {
            console.error(`Erro ao salvar o processo ${idProcesso}:`, erro);
            return of({ idProcesso, dados, sucesso: false })
          })
        );
    });

    forkJoin(requisicoes).subscribe((resultados) => {
      let quantidadeComErro = 0;

      resultados.forEach((resultado) => {
        if (!resultado.sucesso) {
          quantidadeComErro++;
          return;
        }

        this.dadosOriginais.set(resultado.idProcesso, resultado.dados);

        const pendenciaAtual = this.alteracoesPendentes.get(
          resultado.idProcesso,
        );

        // Preserva uma edição mais recente feita enquanto o PUT estava em andamento.
        if (
          pendenciaAtual &&
          this.dadosIguais(pendenciaAtual, resultado.dados)
        ) {
          this.alteracoesPendentes.delete(resultado.idProcesso);
        }
      });

      this.mensagemErroAtualizacao =
        quantidadeComErro > 0
          ? `${quantidadeComErro} processo(s) não foram salvos. As alterações continuam pendentes.`
          : '';

      this.salvandoAlteracoes = false;
    });
  }
  // Mantém o HTML atual funcionando até a troca de blur para ngModelChange.
  // Nesta etapa, este método apenas registra a edição em memória.
  salvarAlteracoes(processo: Processo): void {
    this.registrarAlteracao(processo);
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

  primeiroNomeImportador(nomeImportador: string): string {
    const primeiroNome = nomeImportador.trim().split(/\s+/)[0];

    return primeiroNome?.toLocaleUpperCase('pt-BR') ?? '';
  }

  formatarCnpj(valor?: string | null): string {
    const cnpj = (valor ?? '').replace(/[^0-9a-z]/gi, '').toUpperCase();

    if (!cnpj) return 'Pendente';
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return valor ?? 'Pendente';

    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  }

  formatarDataGrade(valor?: string | null): string {
    if (!valor) return 'Pendente';

    const data = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);

    return data ? `${data[3]}/${data[2]}/${data[1]}` : valor;
  }

  ordenarPor(campo: CampoOrdenacaoProcesso): void {
    if (this.campoOrdenacao === campo) {
      this.direcaoOrdenacao =
        this.direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.campoOrdenacao = campo;
    this.direcaoOrdenacao = 'asc';
  }

  indicadorOrdenacao(campo: CampoOrdenacaoProcesso): string {
    if (this.campoOrdenacao !== campo) {
      return '↕';
    }

    return this.direcaoOrdenacao === 'asc' ? '↑' : '↓';
  }

  ariaOrdenacao(
    campo: CampoOrdenacaoProcesso,
  ): 'ascending' | 'descending' | null {
    if (this.campoOrdenacao !== campo) {
      return null;
    }

    return this.direcaoOrdenacao === 'asc' ? 'ascending' : 'descending';
  }

  private compararValores(valorA?: string, valorB?: string): number {
    const textoA = valorA?.trim() ?? '';
    const textoB = valorB?.trim() ?? '';

    // Mantém os campos vazios no final nas duas direções.
    if (!textoA && !textoB) return 0;
    if (!textoA) return 1;
    if (!textoB) return -1;

    const resultado = textoA.localeCompare(textoB, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    });

    return this.direcaoOrdenacao === 'asc' ? resultado : -resultado;
  }

  get processosDoCliente(): Processo[] {
    const processos = this.processosFiltrados.filter(
      (processo) =>
        (processo.importador?.trim() || 'Importador não identificado') ===
        this.clienteAtivo,
    );

    const campo = this.campoOrdenacao;

    if (!campo) {
      return processos;
    }

    // Ordena uma cópia para não alterar a lista original do service.
    return [...processos].sort((processoA, processoB) =>
      this.compararValores(processoA[campo], processoB[campo]),
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
