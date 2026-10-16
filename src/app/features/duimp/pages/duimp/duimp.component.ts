import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { read, utils, writeFileXLSX } from 'xlsx';
import { ItemDuimp } from '../../models/duimp.model';
import type { Duimp } from '../../models/duimp.model';
import { DuimpService } from '../../services/duimp.service';
import type { Processo } from '../../../processos/models/processo.model';
import { ProcessosService } from '../../../processos/services/processos.service';

@Component({
  selector: 'app-duimp',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './duimp.component.html',
  styleUrl: './duimp.component.scss',
})
export class DuimpComponent implements OnInit {
  processo?: Processo;
  duimp?: Duimp;
  processoNumero = '';
  itensExcelPreview: Omit<ItemDuimp, 'id'>[] = [];
  errosImportacaoExcel: string[] = [];
  mensagemImportacaoExcel = '';

  novoItemDuimp: Omit<ItemDuimp, 'id'> = {
    descricaoMercadoria: '',
    ncm: '',
    quantidade: null,
    unidadeMedida: '',
    valorUnitario: null,
  };

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private duimpService: DuimpService,
  ) { }

  ngOnInit(): void {
    const numeroProcesso = this.route.snapshot.paramMap.get('id');

    if (numeroProcesso) {
      this.processoNumero = numeroProcesso;
      this.processo = this.processosService.buscarPorNumero(numeroProcesso);

      if (this.processo) {
        this.duimp = this.duimpService.obterOuCriar(numeroProcesso);
      }
    }
  }

  atualizarDadosDuimp(): void {
    if (!this.duimp) {
      return;
    }

    this.duimpService.salvar(this.duimp);
  }

  adicionarItemDuimp(): void {
    if (!this.duimp) {
      return;
    }

    const descricao = this.novoItemDuimp.descricaoMercadoria.trim();
    const ncm = this.novoItemDuimp.ncm.trim();

    if (!descricao || !ncm) {
      return;
    }

    const novoItem: ItemDuimp = {
      ...this.novoItemDuimp,
      id: Date.now(),
      descricaoMercadoria: descricao,
      ncm,
    };

    const itens = [...this.duimp.itens, novoItem];

    this.duimpService.atualizarItens(this.processoNumero, itens);
    this.duimp = this.duimpService.buscarPorProcesso(this.processoNumero);

    this.novoItemDuimp = {
      descricaoMercadoria: '',
      ncm: '',
      quantidade: null,
      unidadeMedida: '',
      valorUnitario: null,
    };
  }

  removerItemDuimp(id: number): void {
    if (!this.duimp) {
      return;
    }

    const itens = this.duimp.itens.filter((item) => item.id !== id);

    this.duimpService.atualizarItens(this.processoNumero, itens);
    this.duimp = this.duimpService.buscarPorProcesso(this.processoNumero);
  }

  async carregarItensExcel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    this.itensExcelPreview = [];
    this.errosImportacaoExcel = [];
    this.mensagemImportacaoExcel = '';

    if (!arquivo) {
      return;
    }

    try {
      const workbook = read(await arquivo.arrayBuffer());
      const nomeAba = workbook.SheetNames[0];

      if (!nomeAba) {
        this.errosImportacaoExcel.push('A planilha não contém uma aba.');
        return;
      }

      const planilha = workbook.Sheets[nomeAba];
      const linhas = utils.sheet_to_json<Record<string, unknown>>(planilha, {
        defval: '',
        raw: true,
      });

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
      const colunasEncontradas = Object.keys(linhas[0]);
      const colunasAusentes = colunasObrigatorias.filter(
        (coluna) => !colunasEncontradas.includes(coluna),
      );

      if (colunasAusentes.length > 0) {
        this.errosImportacaoExcel.push(
          'Colunas ausentes: ' + colunasAusentes.join(', '),
        );
        return;
      }

      const itensValidos: Omit<ItemDuimp, 'id'>[] = [];

      linhas.forEach((linha, indice) => {
        const numeroLinha = indice + 2;

        if (Object.values(linha).every((valor) => String(valor).trim() === '')) {
          return;
        }

        const descricaoMercadoria = String(
          linha['DescricaoMercadoria'] ?? '',
        ).trim();
        const ncm = String(linha['NCM'] ?? '').trim();
        const quantidade = this.converterNumeroExcel(linha['Quantidade']);
        const unidadeMedida = String(linha['UnidadeMedida'] ?? '').trim();
        const valorUnitario = this.converterNumeroExcel(
          linha['ValorUnitario'],
        );
        const errosLinha: string[] = [];

        if (!descricaoMercadoria) {
          errosLinha.push('descrição vazia');
        }

        if (!ncm) {
          errosLinha.push('NCM vazio');
        }

        if (quantidade === null || quantidade <= 0) {
          errosLinha.push('quantidade inválida');
        }

        if (!unidadeMedida) {
          errosLinha.push('unidade de medida vazia');
        }

        if (valorUnitario === null || valorUnitario < 0) {
          errosLinha.push('valor unitário inválido');
        }

        if (errosLinha.length > 0) {
          this.errosImportacaoExcel.push(
            `Linha ${numeroLinha}: ${errosLinha.join(', ')}.`,
          );
          return;
        }

        itensValidos.push({
          descricaoMercadoria,
          ncm,
          quantidade,
          unidadeMedida,
          valorUnitario,
        });
      });

      this.itensExcelPreview = itensValidos;

      if (itensValidos.length === 0 && this.errosImportacaoExcel.length === 0) {
        this.errosImportacaoExcel.push(
          'Nenhum item preenchido foi encontrado.',
        );
      }
    } catch {
      this.errosImportacaoExcel.push(
        'Não foi possível ler o arquivo. Confira se ele está no formato Excel.',
      );
    } finally {
      input.value = '';
    }
  }

  confirmarImportacaoExcel(): void {
    if (!this.duimp || this.itensExcelPreview.length === 0) {
      return;
    }

    const itensImportados: ItemDuimp[] = this.itensExcelPreview.map(
      (item, indice) => ({
        ...item,
        id: Date.now() + indice,
      }),
    );
    const itens = [...this.duimp.itens, ...itensImportados];

    this.duimpService.atualizarItens(this.processoNumero, itens);
    this.duimp = this.duimpService.buscarPorProcesso(this.processoNumero);
    this.mensagemImportacaoExcel = `${itensImportados.length} item(ns) importado(s).`;
    this.itensExcelPreview = [];
  }

  private converterNumeroExcel(valor: unknown): number | null {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }

    const texto = String(valor ?? '').trim().replace(',', '.');

    if (!texto) {
      return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : null;
  }

  baixarModeloItensExcel(): void {
    const planilha = utils.aoa_to_sheet([
      [
        'DescricaoMercadoria',
        'NCM',
        'Quantidade',
        'UnidadeMedida',
        'ValorUnitario',
      ],
    ]);

    const workbook = utils.book_new();

    utils.book_append_sheet(workbook, planilha, 'Itens');
    writeFileXLSX(workbook, 'modelo-itens-duimp.xlsx');
  }
}
