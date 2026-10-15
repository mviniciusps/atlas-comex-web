import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ItemDuimp,
  Processo,
  ProcessosService,
} from '../../../processos/services/processos.service';

@Component({
  selector: 'app-duimp',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './duimp.component.html',
  styleUrl: './duimp.component.scss',
})
export class DuimpComponent implements OnInit {
  processo?: Processo;
  processoNumero = '';

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
  ) {}

  ngOnInit(): void {
    const numeroProcesso = this.route.snapshot.paramMap.get('id');

    if (numeroProcesso) {
      this.processoNumero = numeroProcesso;
      this.processo = this.processosService.buscarPorNumero(numeroProcesso);
    }
  }

  atualizarDadosDuimp(): void {
    if (!this.processo) {
      return;
    }

    this.processosService.atualizarDadosDuimp(this.processoNumero, {
      numeroDuimp: this.processo.numeroDuimp,
      situacaoDuimp: this.processo.situacaoDuimp,
      unidadeDespacho: this.processo.unidadeDespacho,
      moedaNegociacao: this.processo.moedaNegociacao,
      valorAduaneiro: this.processo.valorAduaneiro,
    });
  }

  adicionarItemDuimp(): void {
    if (!this.processo) {
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

    const itens = [...this.processo.itensDuimp, novoItem];

    this.processosService.atualizarItensDuimp(this.processoNumero, itens);
    this.processo = this.processosService.buscarPorNumero(this.processoNumero);

    this.novoItemDuimp = {
      descricaoMercadoria: '',
      ncm: '',
      quantidade: null,
      unidadeMedida: '',
      valorUnitario: null,
    };
  }

  removerItemDuimp(id: number): void {
    if (!this.processo) {
      return;
    }

    const itens = this.processo.itensDuimp.filter((item) => item.id !== id);

    this.processosService.atualizarItensDuimp(this.processoNumero, itens);
    this.processo = this.processosService.buscarPorNumero(this.processoNumero);
  }
}
