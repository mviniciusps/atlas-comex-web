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

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private duimpService: DuimpService,
    private documentosService: DocumentosService,
  ) { }

  ngOnInit(): void {
    const numeroProcesso = this.route.snapshot.paramMap.get('id');

    if (!numeroProcesso) {
      return;
    }

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
    const arquivo = (event.target as HTMLInputElement).files?.[0];
    if (arquivo) {
      this.mensagemImportacaoExcel =
        `Invoice selecionada: ${arquivo.name}. A leitura automática será conectada à IA em uma próxima etapa.`;
    }
    (event.target as HTMLInputElement).value = '';
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
      if (colunasAusentes.length) {
        this.errosImportacaoExcel.push(
          `Colunas ausentes: ${colunasAusentes.join(', ')}.`,
        );
        return;
      }

      linhas.forEach((linha, indice) => {
        if (Object.values(linha).every((valor) => String(valor).trim() === '')) {
          return;
        }
        const item: ItemPlanilha = {
          ...this.criarItemVazio(),
          descricaoMercadoria: String(linha['DescricaoMercadoria'] ?? '').trim(),
          ncm: String(linha['NCM'] ?? '').trim(),
          quantidade: this.converterNumeroExcel(linha['Quantidade']),
          unidadeMedida: String(linha['UnidadeMedida'] ?? '').trim(),
          valorUnitario: this.converterNumeroExcel(linha['ValorUnitario']),
        };
        const erros: string[] = [];
        if (!item.descricaoMercadoria) erros.push('descrição vazia');
        if (!/^\d{8}$/.test(item.ncm)) erros.push('NCM deve conter 8 dígitos');
        if (!item.quantidade || item.quantidade <= 0) erros.push('quantidade inválida');
        if (!item.unidadeMedida) erros.push('unidade de medida vazia');
        if (item.valorUnitario === null || item.valorUnitario < 0) {
          erros.push('valor unitário inválido');
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
    const planilha = utils.aoa_to_sheet([
      ['DescricaoMercadoria', 'NCM', 'Quantidade', 'UnidadeMedida', 'ValorUnitario'],
    ]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, planilha, 'Itens');
    writeFileXLSX(workbook, 'modelo-itens-duimp.xlsx');
  }

  baixarItens(): void {
    if (!this.duimp) return;
    const linhas = this.duimp.itens.map((item, indice) => ({
      Numero: indice + 1,
      DescricaoMercadoria: item.descricaoMercadoria,
      NCM: item.ncm,
      Quantidade: item.quantidade,
      UnidadeMedida: item.unidadeMedida,
      ValorUnitario: item.valorUnitario,
      Incoterm: item.incoterm ?? '',
    }));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.json_to_sheet(linhas), 'Itens DUIMP');
    writeFileXLSX(workbook, `itens-duimp-${this.processoNumero}.xlsx`);
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
    link.download = `rascunho-duimp-${this.processoNumero}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  analisarInconsistencias(): void {
    if (!this.duimp) return;
    const avisos: string[] = [];
    const documentoIdentificacao = this.duimp.tipoPessoaImportador === 'Pessoa Jurídica'
      ? this.duimp.cpfCnpjImportador.replace(/\D/g, '').length === 14
      : this.duimp.cpfCnpjImportador.replace(/\D/g, '').length === 11;
    if (!documentoIdentificacao) avisos.push('Confira o CPF/CNPJ do importador.');
    if (!this.duimp.nomeImportador.trim()) avisos.push('Informe o nome/razão social do importador.');
    if (!this.duimp.enderecoImportador.trim()) avisos.push('Informe o endereço do importador.');
    if (!this.duimp.itens.length) avisos.push('Inclua ao menos um item da DUIMP.');
    this.duimp.itens.forEach((item, indice) => {
      if (!/^\d{8}$/.test(item.ncm)) avisos.push(`Item ${indice + 1}: NCM deve ter 8 dígitos.`);
      if (!item.quantidade || item.quantidade <= 0) avisos.push(`Item ${indice + 1}: informe uma quantidade válida.`);
      if (!item.unidadeMedida.trim()) avisos.push(`Item ${indice + 1}: informe a unidade de medida.`);
      if (!item.incoterm) avisos.push(`Item ${indice + 1}: selecione o Incoterm.`);
    });
    this.inconsistencias = avisos;
    this.mensagemAnalise = avisos.length
      ? 'Verificação local concluída. Revise os pontos abaixo; esta análise ainda não usa IA nem valida regras oficiais do Portal Único.'
      : 'Verificação local concluída sem alertas básicos. A validação oficial e a integração com IA serão implementadas depois.';
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
    if (!this.duimp) {
      return;
    }

    const item = this.duimp.itens.find((itemAtual) => itemAtual.id === id);

    if (!item) {
      return;
    }

    this.itemEmEdicaoId = item.id;
    this.novoItemDuimp = { ...this.criarItemVazio(), ...item };
    this.abaItemAtiva = 'mercadoria';
  }

  private converterNumeroExcel(valor: unknown): number | null {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    const texto = String(valor ?? '').trim().replace(',', '.');
    if (!texto) return null;
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  }
}
