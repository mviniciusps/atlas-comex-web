import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { read, utils, writeFileXLSX } from 'xlsx';
import { ItemDuimp } from '../../models/duimp.model';
import type { Duimp } from '../../models/duimp.model';
import { DuimpService } from '../../services/duimp.service';
import type { DocumentoProcesso } from '../../../processos/services/documentos.service';
import { DocumentosService } from '../../../processos/services/documentos.service';
import type { Processo } from '../../../processos/models/processo.model';
import { ProcessosService } from '../../../processos/services/processos.service';

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
  processo?: Processo;
  duimp?: Duimp;
  processoNumero = '';
  abaAtiva: AbaDuimp = 'identificacao';
  abaItemAtiva: 'mercadoria' | 'tributos' = 'mercadoria';
  documentos: DocumentoProcesso[] = [];
  itensExcelPreview: ItemPlanilha[] = [];
  errosImportacaoExcel: string[] = [];
  mensagemImportacaoExcel = '';
  mensagemUploadInvoice = '';
  inconsistencias: string[] = [];
  mensagemAnalise = '';
  novoItemDuimp: ItemPlanilha = this.criarItemVazio();
  itemEmEdicaoId: number | null = null;
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

  tipoDocumentoUpload: DocumentoProcesso['tipo'] = 'Outro';
  mensagemUploadDocumentos = '';

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private duimpService: DuimpService,
    private documentosService: DocumentosService,
  ) { }

  ngOnInit(): void {
    const numeroProcesso = this.route.snapshot.paramMap.get('id');

    if (!numeroProcesso) return;

    this.processoNumero = numeroProcesso;
    this.processo = this.processosService.buscarPorNumero(numeroProcesso);
    this.duimp = this.processo
      ? this.duimpService.obterOuCriar(numeroProcesso)
      : undefined;
    this.atualizarDocumentos();
  }

  get modalidadeAerea(): boolean {
    return this.processo?.modalidade.toLocaleLowerCase().includes('aére') ?? false;
  }

  get totalItens(): number {
    return (
      this.duimp?.itens.reduce(
        (total, item) =>
          total + (item.quantidade ?? 0) * (item.valorUnitario ?? 0),
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

  atualizarUnidadesDespacho(valor: string): void {
    if (!this.duimp) return;
    this.duimp.carga.unidadesDespacho = valor
      .split(',')
      .map((unidade) => unidade.trim())
      .filter(Boolean);
    this.atualizarDadosDuimp();
  }

  atualizarDocumentos(): void {
    this.documentos = this.documentosService.listar(this.processoNumero);
  }

  definirInclusaoDocumento(documento: DocumentoProcesso, incluir: boolean): void {
    this.documentosService.atualizarInclusaoDuimp(
      this.processoNumero,
      documento.id,
      incluir,
    );
    this.atualizarDocumentos();
  }

  documentosServiceAtualizarTipo(
    documento: DocumentoProcesso,
    tipo: DocumentoProcesso['tipo'],
  ): void {
    this.documentosService.atualizarTipo(this.processoNumero, documento.id, tipo);
    this.atualizarDocumentos();
  }

  selecionarInvoice(event: Event): void {
    const input = event.target as HTMLInputElement; //elemento é um campo de entrada, podendo acessar as propriedades do arquivo
    const arquivo = input.files?.[0];

    this.mensagemUploadInvoice = '';

    if (!arquivo) return;

    const documentosAtuais = this.documentosService.listar(this.processoNumero);

    const arquivoJaAnexado = documentosAtuais.some(
      (documento) =>
        documento.tipo === 'Invoice' &&
        documento.nome.toLocaleLowerCase() === arquivo.name.toLocaleLowerCase() &&
        documento.arquivo.size === arquivo.size,
    );

    if (arquivoJaAnexado) {
      this.mensagemUploadInvoice = 'Esta invoice já está anexada ao processo';
      input.value = '';
      return;
    }

    const tamanho = arquivo.size < 1024 * 1024 ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB` : `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`

    this.documentosService.adicionar(this.processoNumero, [
      {
        nome: arquivo.name,
        tamanho,
        tipo: 'Invoice',
        status: 'Aguardando conferência',
        arquivo,
      },
    ]);

    this.atualizarDocumentos();
    this.mensagemUploadInvoice = 'Invoice anexada ao processo. Confira-a na aba Documentos e marque se deseja incluí-la na DUIMP. A leitura automática ainda não está integrada.';
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
    if (!this.duimp) return;
    const conteudo = JSON.stringify(
      { processo: this.processo, duimp: this.duimp, documentosIncluidos: this.documentosIncluidos.map(({ nome, tipo }) => ({ nome, tipo })) },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rascunho - duimp - ${this.processoNumero}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  analisarInconsistencias(): void {
    if (!this.duimp) {
      return;
    }

    const avisos: string[] = [];
    const duimp = this.duimp;
    const carga = duimp.carga;
    const documentoImportador = duimp.cpfCnpjImportador.replace(/\D/g, '');
    const tamanhoDocumento = duimp.tipoPessoaImportador === 'Pessoa Jurídica'
      ? 14
      : 11;

    if (documentoImportador.length !== tamanhoDocumento) {
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
      ? `Conferência local concluída: ${avisos.length} ponto(s) para revisar.Esta análise não usa IA nem valida regras oficiais do Portal Único.`
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

    const documentosAtuais = this.documentosService.listar(this.processoNumero);
    const chavesArquivos = new Set(
      documentosAtuais.map((documento) =>
        this.criarChaveArquivo(documento.nome, documento.arquivo.size),
      ),
    );
    let quantidadeDuplicada = 0;

    const novosDocumentos = arquivos.reduce<
      Omit<DocumentoProcesso, 'id' | 'incluirNaDuimp'>[]
    >((novos, arquivo) => {
      const chaveArquivo = this.criarChaveArquivo(arquivo.name, arquivo.size);

      if (chavesArquivos.has(chaveArquivo)) {
        quantidadeDuplicada++;
        return novos;
      }

      chavesArquivos.add(chaveArquivo);
      novos.push({
        nome: arquivo.name,
        tamanho:
          arquivo.size < 1024 * 1024
            ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB`
            : `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`,
        tipo: this.identificarTipoDocumento(arquivo.name),
        status: 'Aguardando conferência',
        arquivo,
      });

      return novos;
    }, []);

    if (novosDocumentos.length > 0) {
      this.documentosService.adicionar(this.processoNumero, novosDocumentos);
      this.atualizarDocumentos();
    }

    if (novosDocumentos.length > 0 && quantidadeDuplicada > 0) {
      this.mensagemUploadDocumentos =
        `${novosDocumentos.length} documento(s) anexado(s); ` +
        `${quantidadeDuplicada} duplicado(s) ignorado(s).`;
    } else if (novosDocumentos.length > 0) {
      this.mensagemUploadDocumentos =
        `${novosDocumentos.length} documento(s) anexado(s) ao processo.`;
    } else {
      this.mensagemUploadDocumentos =
        'Os arquivos selecionados já estão anexados ao processo.';
    }

    input.value = '';
  }

  atualizarStatusDocumento(
    documento: DocumentoProcesso,
    status: DocumentoProcesso['status']
  ): void {
    this.documentosService.atualizarStatus(
      this.processoNumero,
      documento.id,
      status
    );

    this.atualizarDocumentos();

  }

  private criarChaveArquivo(nome: string, tamanho: number): string {
    return `${nome.trim().toLocaleLowerCase()}-${tamanho}`;
  }

  private identificarTipoDocumento(
    nomeArquivo: string,
  ): DocumentoProcesso['tipo'] {
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
