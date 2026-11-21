import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { read, utils, writeFileXLSX } from 'xlsx';
import type { DadosCargaDuimp, Duimp, ItemDuimp } from '../../models/duimp.model';
import { DuimpService } from '../../services/duimp.service';
import type {
  DocumentoProcesso,
  TipoDocumento,
} from '../../../processos/models/documento-processo.model';
import { DocumentosService } from '../../../processos/services/documentos.service';
import type { Processo } from '../../../processos/models/processo.model';
import { ProcessosService } from '../../../processos/services/processos.service';
import type {
  CargaDuimpApiDto,
  DuimpRascunhoApiDto,
} from '../../models/duimp-rascunho-api';

type AbaDuimp =
  | 'identificacao'
  | 'carga'
  | 'documentos'
  | 'item'
  | 'tratamento-administrativo'
  | 'resumo';

type ItemPlanilha = Omit<ItemDuimp, 'id'>;

@Component({
  selector: 'app-duimp',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './duimp.component.html',
  styleUrl: './duimp.component.scss',
})
export class DuimpComponent implements OnInit {
  private readonly extensoesPermitidasDocumentos = [
    '.pdf',
    '.xml',
    '.xlsx',
    '.xls',
    '.jpg',
    '.jpeg',
    '.png',
    '.tif',
    '.tiff',
  ];

  processo?: Processo;
  duimp?: Duimp;
  processoNumero = '';
  carregandoProcesso = false;
  erroCarregamentoProcesso = '';
  abaAtiva: AbaDuimp = 'identificacao';
  abaItemAtiva: 'mercadoria' | 'tributos' = 'mercadoria';
  documentos: DocumentoProcesso[] = [];
  carregandoDocumentos = false;
  readonly documentosEmAtualizacao = new Set<number>();
  itensExcelPreview: ItemPlanilha[] = [];
  errosImportacaoExcel: string[] = [];
  mensagemImportacaoExcel = '';
  mensagemUploadInvoice = '';
  inconsistencias: string[] = [];
  mensagemAnalise = '';
  novoItemDuimp: ItemPlanilha = this.criarItemVazio();
  itemEmEdicaoId: number | null = null;
  carregandoRascunho = false;
  salvandoRascunho = false;
  mensagemRascunho = '';

  private rascunhoApi?: DuimpRascunhoApiDto;

  readonly tributos = [
    'II',
    'IPI',
    'PIS',
    'COFINS',
    'CBS',
    'IBS Estadual',
    'IBS Municipal',
    'Taxa de Utilização do Siscomex',
  ];
  readonly moedas = ['USD', 'EUR', 'BRL', 'CNY', 'JPY', 'GBP'];
  readonly incoterms = [
    'EXW',
    'FCA',
    'FAS',
    'FOB',
    'CFR',
    'CIF',
    'CPT',
    'CIP',
    'DAP',
    'DPU',
    'DDP',
  ];

  tipoDocumentoUpload: TipoDocumento = 'Outro';
  mensagemUploadDocumentos = '';

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private duimpService: DuimpService,
    private documentosService: DocumentosService,
  ) {}

  ngOnInit(): void {
    const numeroProcesso = this.route.snapshot.paramMap.get('id');

    if (!numeroProcesso) return;

    this.processoNumero = numeroProcesso;
    this.processo = this.processosService.buscarPorNumero(numeroProcesso);

    if (this.processo) {
      this.inicializarProcesso(this.processo);
      return;
    }

    this.carregandoProcesso = true;
    this.processosService.carregar().subscribe({
      next: (processos) => {
        const processo = processos.find((item) => item.numero === numeroProcesso);
        this.carregandoProcesso = false;

        if (processo) {
          this.inicializarProcesso(processo);
        }
      },
      error: () => {
        this.erroCarregamentoProcesso = 'Não foi possível carregar o processo.';
        this.carregandoProcesso = false;
      },
    });
  }

  private inicializarProcesso(processo: Processo): void {
    this.processo = processo;
    this.duimp = this.duimpService.obterOuCriar(processo.numero);
    this.carregarRascunhoApi();
    this.atualizarDocumentos();
  }

  get modalidadeAerea(): boolean {
    const modalidade = this.processo?.modalidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();

    return modalidade?.includes('aere') ?? false;
  }

  get totalItens(): number {
    return (
      this.duimp?.itens.reduce(
        (total, item) =>
          total +
          (item.quantidade ?? 0) *
            (item.valorUnitarioCondicaoVenda ?? item.valorUnitario ?? 0),
        0,
      ) ?? 0
    );
  }

  get documentosIncluidos(): DocumentoProcesso[] {
    return this.documentos.filter((documento) => documento.incluirNaDuimp);
  }

  atualizarDadosDuimp(): void {
    if (this.duimp) {
      this.duimpService.salvar(this.duimp);
    }
  }

  private carregarRascunhoApi(): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined || !this.duimp) {
      return;
    }

    this.carregandoRascunho = true;
    this.mensagemRascunho = '';

    this.duimpService.obterRascunho(idProcesso).subscribe({
      next: (rascunho) => {
        this.aplicarRascunhoApi(rascunho);
        this.carregandoRascunho = false;
      },
      error: (erro: HttpErrorResponse) => {
        if (erro.status === 404) {
          this.rascunhoApi = this.criarRascunhoVazio();
          this.mensagemRascunho = 'Ainda não há rascunho salvo para este processo.';
        } else {
          this.mensagemRascunho = 'Não foi possível carregar o rascunho da DUIMP.';
        }

        this.carregandoRascunho = false;
      },
    });
  }

  private aplicarRascunhoApi(rascunho: DuimpRascunhoApiDto): void {
    if (!this.duimp) return;

    this.rascunhoApi = rascunho;
    this.duimp.tipoPessoaImportador =
      rascunho.tipoPessoaImportador === 'F'
        ? 'Pessoa Física'
        : rascunho.tipoPessoaImportador === 'J'
          ? 'Pessoa Jurídica'
          : this.duimp.tipoPessoaImportador;
    this.duimp.cpfCnpjImportador =
      rascunho.documentoImportador ?? this.duimp.cpfCnpjImportador;
    this.duimp.nomeImportador =
      rascunho.nomeImportador ?? this.duimp.nomeImportador;
    this.duimp.enderecoImportador = rascunho.logradouroImportador ?? '';
    this.duimp.numeroEnderecoImportador =
      rascunho.numeroEnderecoImportador ?? '';
    this.duimp.complementoEnderecoImportador =
      rascunho.complementoEnderecoImportador ?? '';
    this.duimp.bairroImportador = rascunho.bairroImportador ?? '';
    this.duimp.municipioImportador = rascunho.municipioImportador ?? '';
    this.duimp.ufImportador = rascunho.ufImportador ?? '';
    this.duimp.cepImportador = rascunho.cepImportador ?? '';
    this.duimp.paisImportador = rascunho.paisImportador ?? 'Brasil';
    this.duimp.informacoesComplementaresVariaveis =
      rascunho.informacoesComplementaresGeradas ?? '';
    this.duimp.textoPadrao =
      rascunho.informacoesComplementaresAdicionais ?? '';
    this.duimp.usarTextoPadrao = Boolean(
      rascunho.informacoesComplementaresAdicionais?.trim(),
    );
    this.duimp.itens = (rascunho.itens ?? []).map((item, indice) => {
      const fabricante = this.combinarCodigoNome(
        item.codigoFabricante,
        item.nomeFabricante,
      );
      const exportador = this.combinarCodigoNome(
        item.codigoExportador,
        item.nomeExportador,
      );

      return {
        id: item.numeroItem || indice + 1,
        numeroAdicao: item.numeroAdicao,
        descricaoMercadoria: item.nomeProduto ?? '',
        ncm: item.ncm ?? '',
        quantidade:
          item.quantidadeUnidadeComercializada ??
          item.quantidadeMedidaEstatistica,
        unidadeMedida: item.unidadeComercializada ?? '',
        valorUnitario: item.valorUnitarioCondicaoVenda,
        caracterizacaoImportacao: item.caracterizacaoImportacao ?? '',
        versaoProduto: item.versaoProduto ?? '',
        paisOrigemFabricante: item.paisOrigem ?? '',
        codigoNomeFabricante: fabricante,
        versaoFabricante: item.versaoFabricante ?? '',
        enderecoFabricante: item.enderecoFabricante ?? '',
        exportadorEhFabricante: item.exportadorEhFabricante,
        paisOrigemExportador: item.paisExportador ?? '',
        codigoNomeExportador: exportador,
        versaoExportador: item.versaoExportador ?? '',
        enderecoExportador: item.enderecoExportador ?? '',
        ufsConsumo: item.ufConsumo ?? '',
        municipiosConsumo: item.municipioConsumo ?? '',
        aplicacao: item.aplicacao ?? '',
        condicaoMercadoria:
          item.condicaoMercadoria === 'Usado' ? 'Usada' : 'Nova',
        unidadeEstatistica: item.unidadeMedidaEstatistica ?? '',
        quantidadeEstatistica: item.quantidadeMedidaEstatistica,
        pesoLiquido: item.pesoLiquido,
        unidadeComercializada: item.unidadeComercializada ?? '',
        quantidadeComercializada: item.quantidadeUnidadeComercializada,
        moedaNegociada: item.moedaNegociada ?? '',
        valorUnitarioCondicaoVenda: item.valorUnitarioCondicaoVenda,
        numeroSerie: item.numeroSerie ?? '',
        detalhamentoProduto: item.detalhamentoProduto ?? '',
        metodoValoracao: item.metodoValoracao ?? '',
        incoterm: item.incoterm ?? '',
        coberturaCambial: item.coberturaCambial ?? '',
      };
    });

    if (rascunho.carga) {
      this.aplicarCargaApi(rascunho.carga);
    }

    this.duimp.valorAduaneiro = this.totalItens;
    this.duimpService.salvar(this.duimp);
  }

  private combinarCodigoNome(
    codigo: string | null,
    nome: string | null,
  ): string {
    const partes = [codigo?.trim(), nome?.trim()].filter(Boolean);
    return partes.join(' — ');
  }

  private separarCodigoNome(valor: string | undefined): {
    codigo: string | null;
    nome: string | null;
  } {
    const texto = valor?.trim() ?? '';
    const separador = ' — ';
    const indiceSeparador = texto.indexOf(separador);

    if (indiceSeparador < 0) {
      return { codigo: null, nome: texto || null };
    }

    return {
      codigo: texto.slice(0, indiceSeparador).trim() || null,
      nome: texto.slice(indiceSeparador + separador.length).trim() || null,
    };
  }

  private aplicarCargaApi(carga: CargaDuimpApiDto | null): void {
    if (!carga || !this.duimp) {
      return;
    }

    this.duimp.carga = {
      ...this.duimp.carga,
      unidadesDespacho: carga.unidadesDespacho ?? [],
      numeroCe:
        carga.tipoIdentificacaoCarga === 'CE'
          ? carga.identificacaoCarga ?? ''
          : '',
      numeroRuc:
        carga.tipoIdentificacaoCarga === 'RUC'
          ? carga.identificacaoCarga ?? ''
          : '',
      localEmbarque: carga.localEmbarque ?? '',
      dataConhecimento: carga.dataConhecimento ?? '',
      paisProcedencia: carga.paisProcedencia ?? '',
      pesoBruto: carga.pesoBruto,
      pesoLiquido: carga.pesoLiquido,
      moedaFrete: carga.codigoMoedaFrete ?? '',
      valorFreteMoeda: carga.valorFreteMoeda,
      valorFreteReais: carga.valorFreteReais,
      valorAfrmmTum: carga.valorAfrmmTum,
      afrmmTumPago: carga.afrmmTumPago,
      moedaSeguro: carga.codigoMoedaSeguro ?? '',
      valorSeguroMoeda: carga.valorSeguroMoeda,
      valorSeguroReais: carga.valorSeguroReais,
      componentesFrete: (carga.componentesFrete ?? []).map((componente, indice) => ({
        id: indice + 1,
        pagamento: componente.pagamento ?? '',
        tipo: componente.tipo ?? '',
        moeda: componente.moeda ?? '',
        valor: componente.valorMoeda,
      })),
      embalagens: (carga.embalagens ?? []).map((embalagem, indice) => ({
        id: indice + 1,
        item: embalagem.item ?? '',
        tipo: embalagem.tipo ?? '',
        quantidade: embalagem.quantidade,
      })),
    };
  }

  private criarRascunhoVazio(): DuimpRascunhoApiDto {
    return {
      tipoPessoaImportador: null,
      documentoImportador: null,
      nomeImportador: null,
      logradouroImportador: null,
      numeroEnderecoImportador: null,
      complementoEnderecoImportador: null,
      bairroImportador: null,
      codigoMunicipioImportador: null,
      municipioImportador: null,
      ufImportador: null,
      cepImportador: null,
      paisImportador: null,
      informacoesComplementaresGeradas: null,
      informacoesComplementaresAdicionais: null,
      carga: null,
      itens: [],
    };
  }

  private montarCargaApi(carga: DadosCargaDuimp): CargaDuimpApiDto {
    const tipoIdentificacaoCarga: 'CE' | 'RUC' = this.modalidadeAerea
      ? 'RUC'
      : 'CE';

    return {
      tipoIdentificacaoCarga,
      identificacaoCarga:
        tipoIdentificacaoCarga === 'RUC'
          ? carga.numeroRuc || null
          : carga.numeroCe || null,
      localEmbarque: carga.localEmbarque || null,
      dataConhecimento: carga.dataConhecimento || null,
      paisProcedencia: carga.paisProcedencia || null,
      pesoBruto: carga.pesoBruto,
      pesoLiquido: carga.pesoLiquido,
      codigoMoedaFrete: carga.moedaFrete || null,
      valorFreteMoeda: carga.valorFreteMoeda,
      valorFreteReais: carga.valorFreteReais,
      valorAfrmmTum: carga.valorAfrmmTum,
      afrmmTumPago: carga.afrmmTumPago,
      codigoMoedaSeguro: carga.moedaSeguro || null,
      valorSeguroMoeda: carga.valorSeguroMoeda,
      valorSeguroReais: carga.valorSeguroReais,
      unidadesDespacho: carga.unidadesDespacho,
      componentesFrete: carga.componentesFrete.map((componente) => ({
        pagamento: componente.pagamento || null,
        tipo: componente.tipo || null,
        moeda: componente.moeda || null,
        valorMoeda: componente.valor,
      })),
      embalagens: carga.embalagens.map((embalagem) => ({
        item: embalagem.item || null,
        tipo: embalagem.tipo || null,
        quantidade: embalagem.quantidade,
      })),
    };
  }

  salvarRascunhoApi(): void {
    const idProcesso = this.processo?.idProcesso;
    const duimp = this.duimp;

    if (
      idProcesso === undefined ||
      !duimp ||
      this.salvandoRascunho ||
      this.carregandoRascunho
    ) {
      return;
    }

    const itensComMultiplosLocais = duimp.itens.find((item) => {
      const ufs = (item.ufsConsumo ?? '')
        .split(/[;,]/)
        .map((uf) => uf.trim())
        .filter(Boolean);
      const municipios = (item.municipiosConsumo ?? '')
        .split(/[;,]/)
        .map((municipio) => municipio.trim())
        .filter(Boolean);

      return ufs.length > 1 || municipios.length > 1;
    });

    if (itensComMultiplosLocais) {
      this.mensagemRascunho =
        'A API atual aceita apenas uma UF e um município de consumo por item. Ajuste os itens antes de salvar.';
      return;
    }

    const rascunhoBase = this.rascunhoApi ?? this.criarRascunhoVazio();
    const dados: DuimpRascunhoApiDto = {
      tipoPessoaImportador:
        duimp.tipoPessoaImportador === 'Pessoa Física' ? 'F' : 'J',
      documentoImportador:
        duimp.cpfCnpjImportador.replace(/[^a-z0-9]/gi, '').toUpperCase() || null,
      nomeImportador: duimp.nomeImportador.trim() || null,
      logradouroImportador: duimp.enderecoImportador.trim() || null,
      numeroEnderecoImportador:
        duimp.numeroEnderecoImportador.trim() || null,
      complementoEnderecoImportador:
        duimp.complementoEnderecoImportador.trim() || null,
      bairroImportador: duimp.bairroImportador.trim() || null,
      codigoMunicipioImportador: rascunhoBase.codigoMunicipioImportador,
      municipioImportador: duimp.municipioImportador.trim() || null,
      ufImportador: duimp.ufImportador.trim().toUpperCase() || null,
      cepImportador: duimp.cepImportador.replace(/\D/g, '') || null,
      paisImportador: duimp.paisImportador.trim() || null,
      informacoesComplementaresGeradas:
        duimp.informacoesComplementaresVariaveis.trim() || null,
      informacoesComplementaresAdicionais: duimp.usarTextoPadrao
        ? duimp.textoPadrao.trim() || null
        : null,
      carga: this.montarCargaApi(duimp.carga),
      itens: duimp.itens.map((item, indice) => {
        const fabricante = this.separarCodigoNome(item.codigoNomeFabricante);
        const exportador = this.separarCodigoNome(item.codigoNomeExportador);
        const ufConsumo = item.ufsConsumo?.trim().toUpperCase() || '';

        return {
          numeroItem: indice + 1,
          numeroAdicao: item.numeroAdicao ?? null,
          caracterizacaoImportacao:
            item.caracterizacaoImportacao?.trim() || null,
          nomeProduto: item.descricaoMercadoria.trim() || null,
          versaoProduto: item.versaoProduto?.trim() || null,
          ncm: item.ncm.replace(/\D/g, '') || null,
          paisOrigem: item.paisOrigemFabricante?.trim().toUpperCase() || null,
          codigoFabricante: fabricante.codigo,
          nomeFabricante: fabricante.nome,
          versaoFabricante: item.versaoFabricante?.trim() || null,
          enderecoFabricante: item.enderecoFabricante?.trim() || null,
          exportadorEhFabricante: item.exportadorEhFabricante ?? null,
          paisExportador: item.paisOrigemExportador?.trim().toUpperCase() || null,
          codigoExportador: exportador.codigo,
          nomeExportador: exportador.nome,
          versaoExportador: item.versaoExportador?.trim() || null,
          enderecoExportador: item.enderecoExportador?.trim() || null,
          ufConsumo: ufConsumo || null,
          codigoMunicipioConsumo: null,
          municipioConsumo: item.municipiosConsumo?.trim() || null,
          aplicacao: item.aplicacao?.trim() || null,
          condicaoMercadoria:
            item.condicaoMercadoria === 'Usada' ? 'Usado' : 'Novo',
          unidadeMedidaEstatistica: item.unidadeEstatistica?.trim() || null,
          quantidadeMedidaEstatistica: item.quantidadeEstatistica ?? null,
          pesoLiquido: item.pesoLiquido ?? null,
          unidadeComercializada:
            item.unidadeComercializada?.trim() || item.unidadeMedida.trim() || null,
          quantidadeUnidadeComercializada:
            item.quantidadeComercializada ?? item.quantidade ?? null,
          moedaNegociada: item.moedaNegociada?.trim() || null,
          valorUnitarioCondicaoVenda:
            item.valorUnitarioCondicaoVenda ?? item.valorUnitario ?? null,
          numeroSerie: item.numeroSerie?.trim() || null,
          detalhamentoProduto: item.detalhamentoProduto?.trim() || null,
          metodoValoracao: item.metodoValoracao?.trim() || null,
          incoterm: item.incoterm?.trim() || null,
          coberturaCambial: item.coberturaCambial?.trim() || null,
        };
      }),
    };

    this.salvandoRascunho = true;
    this.mensagemRascunho = '';

    this.duimpService.salvarRascunho(idProcesso, dados).subscribe({
      next: () => {
        this.rascunhoApi = dados;
        this.atualizarDadosDuimp();
        this.mensagemRascunho = 'Rascunho da DUIMP salvo.';
        this.salvandoRascunho = false;
      },
      error: (erro: HttpErrorResponse) => {
        const errosApi = erro.error?.errors as
          | Record<string, string[]>
          | undefined;
        const primeiroErro = errosApi
          ? Object.values(errosApi).flat().find(Boolean)
          : null;

        this.mensagemRascunho = primeiroErro
          ? `A API recusou o rascunho: ${primeiroErro}`
          : 'Não foi possível salvar o rascunho da DUIMP.';
        this.salvandoRascunho = false;
      },
    });
  }

  atualizarUnidadesDespacho(valor: string): void {
    if (!this.duimp) return;
    this.duimp.carga.unidadesDespacho = valor
      .split(',')
      .map((unidade) => unidade.trim())
      .filter(Boolean);
    this.atualizarDadosDuimp();
  }

  atualizarDocumentos(): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) {
      this.documentos = [];
      return;
    }

    this.carregandoDocumentos = true;
    this.documentosService.listar(idProcesso).subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.carregandoDocumentos = false;
      },
      error: () => {
        this.carregandoDocumentos = false;
        this.mensagemUploadDocumentos =
          'Não foi possível carregar os documentos do processo.';
      },
    });
  }

  definirInclusaoDocumento(documento: DocumentoProcesso, incluir: boolean): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) return;

    this.documentosEmAtualizacao.add(documento.idDocumento);
    this.documentosService.atualizarInclusaoDuimp(
      idProcesso,
      documento.idDocumento,
      incluir,
    ).subscribe({
      next: () => {
        documento.incluirNaDuimp = incluir;
        this.documentosEmAtualizacao.delete(documento.idDocumento);
      },
      error: () => {
        this.documentosEmAtualizacao.delete(documento.idDocumento);
        this.mensagemUploadDocumentos =
          'Não foi possível atualizar a inclusão do documento na DUIMP.';
      },
    });
  }

  selecionarInvoice(event: Event): void {
    const input = event.target as HTMLInputElement; //elemento é um campo de entrada, podendo acessar as propriedades do arquivo
    const arquivo = input.files?.[0];

    this.mensagemUploadInvoice = '';

    if (!arquivo) return;

    this.enviarArquivos([arquivo], () => 'Invoice', (mensagem) => {
      this.mensagemUploadInvoice = mensagem;
    });
    input.value = '';
  }

  adicionarComponenteFrete(): void {
    if (!this.duimp) return;

    this.duimp.carga.componentesFrete.push({
      id: Date.now(),
      pagamento: '',
      tipo: '',
      moeda: this.duimp.carga.moedaFrete,
      valor: null,
    });
    this.atualizarDadosDuimp();
  }

  removerComponenteFrete(id: number): void {
    if (!this.duimp) return;
    this.duimp.carga.componentesFrete = this.duimp.carga.componentesFrete.filter(
      (componente) => componente.id !== id,
    );
    this.atualizarDadosDuimp();
  }

  adicionarEmbalagem(): void {
    if (!this.duimp) return;
    this.duimp.carga.embalagens.push({
      id: Date.now(),
      item: '',
      tipo: '',
      quantidade: null,
    });
    this.atualizarDadosDuimp();
  }

  removerEmbalagem(id: number): void {
    if (!this.duimp) return;
    this.duimp.carga.embalagens = this.duimp.carga.embalagens.filter(
      (embalagem) => embalagem.id !== id,
    );
    this.atualizarDadosDuimp();
  }

  adicionarItemDuimp(): void {
    if (!this.duimp) return;

    const descricaoMercadoria = this.novoItemDuimp.descricaoMercadoria.trim();
    const ncm = this.novoItemDuimp.ncm.trim();
    if (!descricaoMercadoria || !ncm) return;

    const itemAtualizado: ItemDuimp = {
      ...this.novoItemDuimp,
      id: this.itemEmEdicaoId ?? Date.now(),
      descricaoMercadoria,
      ncm,
    };
    this.duimp.itens = this.itemEmEdicaoId === null
      ? [...this.duimp.itens, itemAtualizado]
      : this.duimp.itens.map((item) =>
        item.id === this.itemEmEdicaoId ? itemAtualizado : item,
      );
    this.duimp.valorAduaneiro = this.totalItens;
    this.atualizarDadosDuimp();
    this.novoItemDuimp = this.criarItemVazio();
    this.itemEmEdicaoId = null;
  }

  cancelarEdicaoItem(): void {
    this.itemEmEdicaoId = null;
    this.novoItemDuimp = this.criarItemVazio();
  }

  removerItemDuimp(id: number): void {
    if (!this.duimp) return;
    this.duimp.itens = this.duimp.itens.filter((item) => item.id !== id);
    if (this.itemEmEdicaoId === id) this.cancelarEdicaoItem();
    this.duimp.valorAduaneiro = this.totalItens;
    this.atualizarDadosDuimp();
  }

  async carregarItensExcel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    this.itensExcelPreview = [];
    this.errosImportacaoExcel = [];
    this.mensagemImportacaoExcel = '';

    if (!arquivo) return;

    try {
      const workbook = read(await arquivo.arrayBuffer());
      const primeiraAba = workbook.SheetNames[0];

      if (!primeiraAba) {
        this.errosImportacaoExcel.push('A planilha não contém uma aba.');
        return;
      }

      const linhas = utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[primeiraAba],
        { defval: '', raw: true },
      );

      if (linhas.length === 0) {
        this.errosImportacaoExcel.push('A planilha não contém itens.');
        return;
      }

      const colunasObrigatorias = [
        'DescricaoMercadoria',
        'NCM',
        'Quantidade',
        'UnidadeMedida',
        'ValorUnitario',
      ];

      const colunasAusentes = colunasObrigatorias.filter(
        (coluna) => !Object.keys(linhas[0]).includes(coluna),
      );

      if (colunasAusentes.length > 0) {
        this.errosImportacaoExcel.push(
          `Colunas obrigatórias ausentes: ${colunasAusentes.join(', ')}.`,
        );
        return;
      }

      linhas.forEach((linha, indice) => {
        const numeroLinha = indice + 2;

        if (Object.values(linha).every((valor) => String(valor).trim() === '')) {
          return;
        }

        const item = this.mapearLinhaExcel(linha);
        const erros: string[] = [];

        if (!item.descricaoMercadoria) erros.push('descrição vazia');
        if (!/^\d{8}$/.test(item.ncm)) erros.push('NCM deve conter 8 dígitos');
        if (!item.quantidade || item.quantidade <= 0) erros.push('quantidade inválida');
        if (!item.unidadeMedida) erros.push('unidade de medida vazia');
        if (item.valorUnitario === null || item.valorUnitario < 0) {
          erros.push('valor unitário inválido');
        }

        const incoterm = String(linha['Incoterm'] ?? '').trim();
        if (incoterm && !this.incoterms.includes(incoterm)) {
          erros.push('Incoterm inválido');
        }

        const relacaoExportadorFabricante = String(
          linha['ExportadorEhFabricante'] ?? '',
        ).trim();
        if (
          relacaoExportadorFabricante &&
          this.converterBooleanExcel(relacaoExportadorFabricante) === null
        ) {
          erros.push('ExportadorEhFabricante deve ser Sim ou Não');
        }

        if (erros.length) {
          this.errosImportacaoExcel.push(`Linha ${indice + 2}: ${erros.join(', ')}.`);
        } else {
          this.itensExcelPreview.push(item);
        }
      });

      if (!this.itensExcelPreview.length && !this.errosImportacaoExcel.length) {
        this.errosImportacaoExcel.push('Nenhum item preenchido foi encontrado.');
      }
    } catch {
      this.errosImportacaoExcel.push(
        'Não foi possível ler o arquivo. Confira se está no formato Excel.',
      );
    } finally {
      input.value = '';
    }
  }

  confirmarImportacaoExcel(): void {
    if (!this.duimp || !this.itensExcelPreview.length) return;
    const itensImportados = this.itensExcelPreview.map((item, indice) => ({
      ...item,
      id: Date.now() + indice,
    }));
    this.duimp.itens = [...this.duimp.itens, ...itensImportados];
    this.duimp.valorAduaneiro = this.totalItens;
    this.atualizarDadosDuimp();
    this.mensagemImportacaoExcel = `${itensImportados.length} item(ns) importado(s).`;
    this.itensExcelPreview = [];
  }

  baixarModeloItensExcel(): void {

    const colunas = [
      'DescricaoMercadoria',
      'NumeroAdicao',
      'NCM',
      'Quantidade',
      'UnidadeMedida',
      'ValorUnitario',
      'CaracterizacaoImportacao',
      'VersaoProduto',
      'PaisOrigemFabricante',
      'CodigoNomeFabricante',
      'VersaoFabricante',
      'EnderecoFabricante',
      'ExportadorEhFabricante',
      'PaisOrigemExportador',
      'CodigoNomeExportador',
      'VersaoExportador',
      'EnderecoExportador',
      'UfsConsumo',
      'MunicipiosConsumo',
      'Aplicacao',
      'CondicaoMercadoria',
      'UnidadeEstatistica',
      'QuantidadeEstatistica',
      'PesoLiquido',
      'UnidadeComercializada',
      'QuantidadeComercializada',
      'MoedaNegociada',
      'ValorUnitarioCondicaoVenda',
      'NumeroSerie',
      'DetalhamentoProduto',
      'MetodoValoracao',
      'Incoterm',
      'CoberturaCambial',
    ];

    const planilha = utils.aoa_to_sheet([colunas]);
    planilha['!cols'] = colunas.map((coluna) => ({
      wch: Math.min(Math.max(coluna.length + 2, 18), 32),
    }));

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, planilha, 'Itens');
    writeFileXLSX(workbook, 'modelo-itens-duimp.xlsx');
  }

  baixarItens(): void {
    if (!this.duimp) return;

    const linhas = this.duimp.itens.map((item, indice) => {
      const { id, ...dadosItem } = item;

      return {
        Numero: indice + 1,
        ...dadosItem
      };
    });

    const workbook = utils.book_new();
    const planilha = utils.json_to_sheet(linhas);

    utils.book_append_sheet(workbook, planilha, 'Itens DUIMP');
    writeFileXLSX(workbook, `itens-duimp-${this.processoNumero
      }.xlsx`);
  }

  baixarRascunho(): void {
    if (!this.duimp || !this.processo) return;

    const workbook = utils.book_new();
    const tabela = <T extends object>(linhas: T[], colunas: string[]) =>
      linhas.length ? utils.json_to_sheet(linhas) : utils.aoa_to_sheet([colunas]);
    const ficha = (
      linhas: Array<[string, string | number | null | undefined]>,
    ) => utils.aoa_to_sheet([['Campo', 'Valor'], ...linhas]);
    const identificacao = ficha([
      ['Processo', this.processo.numero],
      ['Importador', this.duimp.nomeImportador],
      ['Tipo de pessoa', this.duimp.tipoPessoaImportador],
      ['CPF/CNPJ', this.duimp.cpfCnpjImportador],
      ['Logradouro', this.duimp.enderecoImportador],
      ['Número', this.duimp.numeroEnderecoImportador],
      ['Complemento', this.duimp.complementoEnderecoImportador],
      ['Bairro', this.duimp.bairroImportador],
      ['Município', this.duimp.municipioImportador],
      ['UF', this.duimp.ufImportador],
      ['CEP', this.duimp.cepImportador],
      ['País', this.duimp.paisImportador],
      ['Informações complementares variáveis', this.duimp.informacoesComplementaresVariaveis],
      [
        'Texto adicional',
        this.duimp.usarTextoPadrao ? this.duimp.textoPadrao : '',
      ],
      ['Situação local', this.duimp.situacaoDuimp],
    ]);
    const carga = ficha([
      ['Modal', this.processo.modalidade],
      ['Unidades de despacho', this.duimp.carga.unidadesDespacho.join(', ')],
      ['CE Mercante', this.duimp.carga.numeroCe],
      ['RUC', this.duimp.carga.numeroRuc],
      ['Local de embarque', this.duimp.carga.localEmbarque],
      ['Data do conhecimento', this.duimp.carga.dataConhecimento],
      ['País de procedência', this.duimp.carga.paisProcedencia],
      ['Peso bruto', this.duimp.carga.pesoBruto],
      ['Peso líquido', this.duimp.carga.pesoLiquido],
      ['Moeda do frete', this.duimp.carga.moedaFrete],
      ['Frete na moeda', this.duimp.carga.valorFreteMoeda],
      ['Frete em reais', this.duimp.carga.valorFreteReais],
      ['AFRMM/TUM', this.duimp.carga.valorAfrmmTum],
      ['AFRMM/TUM pago', this.duimp.carga.afrmmTumPago ? 'Sim' : 'Não'],
      ['Moeda do seguro', this.duimp.carga.moedaSeguro],
      ['Seguro na moeda', this.duimp.carga.valorSeguroMoeda],
      ['Seguro em reais', this.duimp.carga.valorSeguroReais],
    ]);
    const itens = this.duimp.itens.map((item, indice) => ({
      Numero: indice + 1,
      NumeroAdicao: item.numeroAdicao ?? '',
      DescricaoMercadoria: item.descricaoMercadoria,
      NCM: item.ncm,
      Quantidade: item.quantidade ?? '',
      UnidadeMedida: item.unidadeMedida,
      ValorUnitario: item.valorUnitario ?? '',
      CaracterizacaoImportacao: item.caracterizacaoImportacao ?? '',
      VersaoProduto: item.versaoProduto ?? '',
      PaisOrigemFabricante: item.paisOrigemFabricante ?? '',
      CodigoNomeFabricante: item.codigoNomeFabricante ?? '',
      VersaoFabricante: item.versaoFabricante ?? '',
      EnderecoFabricante: item.enderecoFabricante ?? '',
      ExportadorEhFabricante: item.exportadorEhFabricante ?? '',
      PaisOrigemExportador: item.paisOrigemExportador ?? '',
      CodigoNomeExportador: item.codigoNomeExportador ?? '',
      VersaoExportador: item.versaoExportador ?? '',
      EnderecoExportador: item.enderecoExportador ?? '',
      UfsConsumo: item.ufsConsumo ?? '',
      MunicipiosConsumo: item.municipiosConsumo ?? '',
      Aplicacao: item.aplicacao ?? '',
      CondicaoMercadoria: item.condicaoMercadoria ?? '',
      UnidadeEstatistica: item.unidadeEstatistica ?? '',
      QuantidadeEstatistica: item.quantidadeEstatistica ?? '',
      PesoLiquido: item.pesoLiquido ?? '',
      UnidadeComercializada: item.unidadeComercializada ?? '',
      QuantidadeComercializada: item.quantidadeComercializada ?? '',
      MoedaNegociada: item.moedaNegociada ?? '',
      ValorUnitarioCondicaoVenda: item.valorUnitarioCondicaoVenda ?? '',
      NumeroSerie: item.numeroSerie ?? '',
      DetalhamentoProduto: item.detalhamentoProduto ?? '',
      MetodoValoracao: item.metodoValoracao ?? '',
      Incoterm: item.incoterm ?? '',
      CoberturaCambial: item.coberturaCambial ?? '',
    }));
    const componentesFrete = this.duimp.carga.componentesFrete.map((item) => ({
      Pagamento: item.pagamento,
      Tipo: item.tipo,
      Moeda: item.moeda,
      ValorMoeda: item.valor,
    }));
    const embalagens = this.duimp.carga.embalagens.map((item) => ({
      Item: item.item,
      Tipo: item.tipo,
      Quantidade: item.quantidade ?? '',
    }));
    const documentos = this.documentosIncluidos.map((documento) => ({
      Nome: documento.nomeArquivo,
      Tipo: documento.tipoDocumento,
      TamanhoBytes: documento.tamanhoBytes,
      IncluirNaDuimp: 'Sim',
    }));

    utils.book_append_sheet(workbook, identificacao, 'Identificacao');
    utils.book_append_sheet(workbook, carga, 'Carga');
    utils.book_append_sheet(
      workbook,
      tabela(componentesFrete, ['Pagamento', 'Tipo', 'Moeda', 'ValorMoeda']),
      'Componentes frete',
    );
    utils.book_append_sheet(
      workbook,
      tabela(embalagens, ['Item', 'Tipo', 'Quantidade']),
      'Embalagens',
    );
    utils.book_append_sheet(workbook, tabela(itens, ['Numero', 'NumeroAdicao', 'DescricaoMercadoria', 'NCM']), 'Itens');
    utils.book_append_sheet(
      workbook,
      tabela(documentos, ['Nome', 'Tipo', 'TamanhoBytes', 'IncluirNaDuimp']),
      'Documentos',
    );

    const nomeSeguro = this.processoNumero.replace(/[<>:"/\\|?*]/g, '-');
    writeFileXLSX(workbook, `rascunho-duimp-${nomeSeguro}.xlsx`);
  }

  analisarInconsistencias(): void {
    if (!this.duimp) {
      return;
    }

    const avisos: string[] = [];
    const duimp = this.duimp;
    const carga = duimp.carga;
    const documentoImportador = duimp.cpfCnpjImportador
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
    const documentoValido = duimp.tipoPessoaImportador === 'Pessoa Jurídica'
      ? /^[A-Z0-9]{12}\d{2}$/.test(documentoImportador)
      : /^\d{11}$/.test(documentoImportador);

    if (!documentoValido) {
      avisos.push(
        `Identificação: confira o ${duimp.tipoPessoaImportador === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'
        } do importador.`,
      );
    }

    if (!duimp.nomeImportador.trim()) {
      avisos.push('Identificação: informe o nome ou a razão social do importador.');
    }

    if (!duimp.enderecoImportador.trim()) {
      avisos.push('Identificação: informe o endereço do importador.');
    }

    if (!duimp.municipioImportador.trim() || !duimp.ufImportador.trim()) {
      avisos.push('Identificação: confira município e UF do importador.');
    }

    if (!carga.unidadesDespacho.some((unidade) => unidade.trim())) {
      avisos.push('Carga: informe ao menos uma unidade de despacho.');
    }

    if (this.modalidadeAerea) {
      if (!carga.numeroRuc.trim()) {
        avisos.push('Carga aérea: informe o número RUC.');
      }

      if (!carga.moedaFrete || carga.valorFreteMoeda === null) {
        avisos.push('Carga aérea: confira moeda e valor do frete.');
      }
    } else {
      if (!carga.numeroCe.trim()) {
        avisos.push('Carga marítima: informe o número do CE.');
      }

      if (!carga.localEmbarque.trim()) {
        avisos.push('Carga marítima: informe o local de embarque.');
      }

      if (!carga.dataConhecimento) {
        avisos.push('Carga marítima: informe a data do conhecimento.');
      }

      if (!carga.paisProcedencia.trim()) {
        avisos.push('Carga marítima: informe o país de procedência.');
      }

      if (carga.pesoBruto === null || carga.pesoBruto <= 0) {
        avisos.push('Carga marítima: confira o peso bruto.');
      }

      if (carga.pesoLiquido === null || carga.pesoLiquido <= 0) {
        avisos.push('Carga marítima: confira o peso líquido.');
      }

      carga.componentesFrete.forEach((componente, indice) => {
        const linhaIncompleta =
          !componente.pagamento.trim() ||
          !componente.tipo.trim() ||
          !componente.moeda ||
          componente.valor === null;

        if (linhaIncompleta) {
          avisos.push(
            `Frete: confira o preenchimento do componente ${indice + 1}.`,
          );
        }
      });
    }

    if (this.documentos.length > 0 && this.documentosIncluidos.length === 0) {
      avisos.push(
        'Documentos: nenhum dos arquivos do processo foi marcado para inclusão na DUIMP.',
      );
    }

    if (duimp.itens.length === 0) {
      avisos.push('Itens: inclua ao menos um item na declaração.');
    }

    duimp.itens.forEach((item, indice) => {
      const numeroItem = indice + 1;

      if (!/^\d{8}$/.test(item.ncm)) {
        avisos.push(`Item ${numeroItem}: o NCM deve conter 8 dígitos.`);
      }

      if (item.quantidade === null || item.quantidade <= 0) {
        avisos.push(`Item ${numeroItem}: informe uma quantidade maior que zero.`);
      }

      if (!item.unidadeMedida.trim()) {
        avisos.push(`Item ${numeroItem}: informe a unidade comercializada.`);
      }

      if (item.valorUnitario === null || item.valorUnitario < 0) {
        avisos.push(`Item ${numeroItem}: confira o valor unitário.`);
      }

      if (!item.incoterm) {
        avisos.push(`Item ${numeroItem}: selecione o Incoterm.`);
      }

      if (!item.paisOrigemFabricante?.trim()) {
        avisos.push(`Item ${numeroItem}: informe o país de origem do fabricante.`);
      }

      if (!item.codigoNomeFabricante?.trim()) {
        avisos.push(`Item ${numeroItem}: informe o fabricante.`);
      }

      if (
        item.exportadorEhFabricante === false &&
        (!item.paisOrigemExportador?.trim() ||
          !item.codigoNomeExportador?.trim())
      ) {
        avisos.push(
          `Item ${numeroItem}: complete os dados do exportador, pois ele difere do fabricante.`,
        );
      }
    });

    this.inconsistencias = avisos;
    this.mensagemAnalise = avisos.length
      ? `Conferência local concluída: ${avisos.length} ponto(s) para revisar. Esta análise não usa IA nem valida regras oficiais do Portal Único.`
      : 'Conferência local concluída sem alertas básicos. A validação oficial e a análise por IA ainda serão integradas.';
  }

  private mapearLinhaExcel(
    linha: Record<string, unknown>,
  ): ItemPlanilha {
    const itemVazio = this.criarItemVazio();
    const ncmOriginal = linha['NCM'];
    let ncm = String(ncmOriginal ?? '').trim().replace(/\D/g, '');

    // O Excel pode remover zeros à esquerda quando o NCM é tratado como número.
    if (typeof ncmOriginal === 'number' && ncm.length < 8) {
      ncm = ncm.padStart(8, '0');
    }

    return {
      ...itemVazio,
      numeroAdicao: this.converterNumeroExcel(linha['NumeroAdicao']),
      descricaoMercadoria: String(
        linha['DescricaoMercadoria'] ?? '',
      ).trim(),
      ncm,
      quantidade: this.converterNumeroExcel(linha['Quantidade']),
      unidadeMedida: String(linha['UnidadeMedida'] ?? '').trim(),
      valorUnitario: this.converterNumeroExcel(linha['ValorUnitario']),
      caracterizacaoImportacao: String(
        linha['CaracterizacaoImportacao'] ?? '',
      ).trim(),
      versaoProduto: String(linha['VersaoProduto'] ?? '').trim(),
      paisOrigemFabricante: String(
        linha['PaisOrigemFabricante'] ?? '',
      ).trim(),
      codigoNomeFabricante: String(
        linha['CodigoNomeFabricante'] ?? '',
      ).trim(),
      versaoFabricante: String(
        linha['VersaoFabricante'] ?? '',
      ).trim(),
      enderecoFabricante: String(
        linha['EnderecoFabricante'] ?? '',
      ).trim(),
      exportadorEhFabricante: this.converterBooleanExcel(
        linha['ExportadorEhFabricante'],
      ),
      paisOrigemExportador: String(
        linha['PaisOrigemExportador'] ?? '',
      ).trim(),
      codigoNomeExportador: String(
        linha['CodigoNomeExportador'] ?? '',
      ).trim(),
      versaoExportador: String(
        linha['VersaoExportador'] ?? '',
      ).trim(),
      enderecoExportador: String(
        linha['EnderecoExportador'] ?? '',
      ).trim(),
      ufsConsumo: String(linha['UfsConsumo'] ?? '').trim(),
      municipiosConsumo: String(
        linha['MunicipiosConsumo'] ?? '',
      ).trim(),
      aplicacao: String(linha['Aplicacao'] ?? '').trim(),
      condicaoMercadoria:
        String(linha['CondicaoMercadoria'] ?? 'Nova').trim() === 'Usada'
          ? 'Usada'
          : 'Nova',
      unidadeEstatistica: String(
        linha['UnidadeEstatistica'] ?? '',
      ).trim(),
      quantidadeEstatistica: this.converterNumeroExcel(
        linha['QuantidadeEstatistica'],
      ),
      pesoLiquido: this.converterNumeroExcel(linha['PesoLiquido']),
      unidadeComercializada: String(
        linha['UnidadeComercializada'] ?? '',
      ).trim(),
      quantidadeComercializada: this.converterNumeroExcel(
        linha['QuantidadeComercializada'],
      ),
      moedaNegociada: String(linha['MoedaNegociada'] ?? '').trim(),
      valorUnitarioCondicaoVenda: this.converterNumeroExcel(
        linha['ValorUnitarioCondicaoVenda'],
      ),
      numeroSerie: String(linha['NumeroSerie'] ?? '').trim(),
      detalhamentoProduto: String(
        linha['DetalhamentoProduto'] ?? '',
      ).trim(),
      metodoValoracao: String(linha['MetodoValoracao'] ?? '').trim(),
      incoterm: String(linha['Incoterm'] ?? '').trim(),
      coberturaCambial: String(
        linha['CoberturaCambial'] ?? '',
      ).trim(),
    };
  }

  private converterBooleanExcel(valor: unknown): boolean | null {
    if (typeof valor === 'boolean') {
      return valor;
    }

    const texto = String(valor ?? '').trim().toLocaleLowerCase();

    if (['sim', 's', 'true', '1'].includes(texto)) {
      return true;
    }

    if (['não', 'nao', 'n', 'false', '0'].includes(texto)) {
      return false;
    }

    return null;
  }

  criarItemVazio(): ItemPlanilha {
    return {
      numeroAdicao: null,
      descricaoMercadoria: '',
      ncm: '',
      quantidade: null,
      unidadeMedida: '',
      valorUnitario: null,
      caracterizacaoImportacao: '',
      versaoProduto: '',
      paisOrigemFabricante: '',
      codigoNomeFabricante: '',
      versaoFabricante: '',
      enderecoFabricante: '',
      exportadorEhFabricante: null,
      paisOrigemExportador: '',
      codigoNomeExportador: '',
      versaoExportador: '',
      enderecoExportador: '',
      ufsConsumo: '',
      municipiosConsumo: '',
      aplicacao: '',
      condicaoMercadoria: 'Nova',
      unidadeEstatistica: '',
      quantidadeEstatistica: null,
      pesoLiquido: null,
      unidadeComercializada: '',
      quantidadeComercializada: null,
      moedaNegociada: '',
      valorUnitarioCondicaoVenda: null,
      numeroSerie: '',
      detalhamentoProduto: '',
      metodoValoracao: '',
      incoterm: '',
      coberturaCambial: '',
    };
  }

  editarItemDuimp(id: number): void {
    if (!this.duimp) return;

    const item = this.duimp.itens.find((itemAtual) => itemAtual.id === id);

    if (!item) return;

    this.itemEmEdicaoId = item.id;
    this.novoItemDuimp = { ...this.criarItemVazio(), ...item };
    this.abaItemAtiva = 'mercadoria';
  }

  anexarDocumentosProcesso(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);

    this.mensagemUploadDocumentos = '';

    if (arquivos.length === 0) return;

    this.enviarArquivos(
      arquivos,
      (arquivo) => this.identificarTipoDocumento(arquivo.name),
      (mensagem) => {
        this.mensagemUploadDocumentos = mensagem;
      },
    );

    input.value = '';
  }

  formatarTamanhoArquivo(tamanhoBytes: number): string {
    if (tamanhoBytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(tamanhoBytes / 1024))} KB`;
    }

    return `${(tamanhoBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private enviarArquivos(
    arquivos: File[],
    obterTipo: (arquivo: File) => TipoDocumento,
    definirMensagem: (mensagem: string) => void,
  ): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) {
      definirMensagem('Não foi possível identificar o processo para o upload.');
      return;
    }

    const chavesExistentes = new Set(
      this.documentos.map((documento) =>
        this.criarChaveArquivo(documento.nomeArquivo, documento.tamanhoBytes),
      ),
    );
    const arquivosValidos: File[] = [];
    const errosValidacao: string[] = [];
    let duplicados = 0;

    for (const arquivo of arquivos) {
      const extensao = arquivo.name.slice(arquivo.name.lastIndexOf('.')).toLowerCase();
      const chave = this.criarChaveArquivo(arquivo.name, arquivo.size);

      if (!this.extensoesPermitidasDocumentos.includes(extensao)) {
        errosValidacao.push(`${arquivo.name}: formato não permitido.`);
        continue;
      }

      if (arquivo.size > 25 * 1024 * 1024) {
        errosValidacao.push(`${arquivo.name}: excede o limite de 25 MB.`);
        continue;
      }

      if (chavesExistentes.has(chave)) {
        duplicados++;
        continue;
      }

      chavesExistentes.add(chave);
      arquivosValidos.push(arquivo);
    }

    if (arquivosValidos.length === 0) {
      const mensagens = [...errosValidacao];
      if (duplicados > 0) mensagens.push(`${duplicados} arquivo(s) já anexado(s).`);
      definirMensagem(mensagens.join(' ') || 'Nenhum arquivo válido foi selecionado.');
      return;
    }

    this.carregandoDocumentos = true;
    const envios = arquivosValidos.map((arquivo) =>
      this.documentosService
        .enviar(idProcesso, arquivo, obterTipo(arquivo))
        .pipe(catchError(() => of(null))),
    );

    forkJoin(envios).subscribe((resultados) => {
      const enviados = resultados.filter(
        (documento): documento is DocumentoProcesso => documento !== null,
      );
      const falhas = resultados.length - enviados.length;

      this.documentos = [...enviados, ...this.documentos];
      this.carregandoDocumentos = false;

      const mensagens = [];
      if (enviados.length > 0) {
        mensagens.push(`${enviados.length} documento(s) enviado(s).`);
      }
      if (duplicados > 0) mensagens.push(`${duplicados} duplicado(s) ignorado(s).`);
      if (falhas > 0) mensagens.push(`${falhas} envio(s) falharam.`);
      mensagens.push(...errosValidacao);
      definirMensagem(mensagens.join(' '));
    });
  }

  private criarChaveArquivo(nome: string, tamanho: number): string {
    return `${nome.trim().toLocaleLowerCase()}-${tamanho}`;
  }

  private identificarTipoDocumento(nomeArquivo: string): TipoDocumento {
    const nomeNormalizado = nomeArquivo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();

    if (
      /invoice|fatura|commercial.?invoice|nota.?fiscal/.test(nomeNormalizado)
    ) {
      return 'Invoice';
    }

    if (/packing.?list|romaneio/.test(nomeNormalizado)) {
      return 'Packing List';
    }

    if (
      /conhecimento|bill.?of.?lading|\b(bl|awb|hbl|mbl)\b|waybill/.test(
        nomeNormalizado,
      )
    ) {
      return 'Conhecimento de carga';
    }

    if (/certificado|certificate|certificado.?de.?origem/.test(nomeNormalizado)) {
      return 'Certificado';
    }

    return this.tipoDocumentoUpload;
  }

  private converterNumeroExcel(valor: unknown): number | null {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    let texto = String(valor ?? '').trim();

    if (!texto) return null;

    if (texto.includes(',') && texto.includes('.')) {
      texto =
        texto.lastIndexOf(',') > texto.lastIndexOf('.')
          ? texto.replace(/\./g, '').replace(',', '.')
          : texto.replace(/,/g, '');
    } else {
      texto = texto.replace(',', '.');
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }
}
