import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DocumentoProcesso,
  DocumentosService,
  TipoDocumento,
} from '../../services/documentos.service';
import {
  Processo,
  ProcessosService,
} from '../../services/processos.service';

@Component({
  selector: 'app-detalhe-processo',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './detalhe-processo.component.html',
  styleUrl: './detalhe-processo.component.scss',
})
export class DetalheProcessoComponent implements OnInit {
  processo?: Processo;
  processoNumero = '';
  mensagensUpload: string[] = [];

  tiposDocumento: TipoDocumento[] = [
    'Invoice',
    'Packing List',
    'Conhecimento de carga',
    'Certificado',
    'Outro',
  ];

  private readonly extensoesPermitidas = [
    '.pdf',
    '.xml',
    '.xlsx',
    '.xls',
    '.jpg',
    '.jpeg',
    '.png',
  ];

  private readonly tamanhoMaximoArquivo = 20 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private documentosService: DocumentosService,
  ) { }

  get documentos(): DocumentoProcesso[] {
    return this.documentosService.listar(this.processoNumero);
  }

  get documentosPendentes(): TipoDocumento[] {
    const documentosObrigatorios: TipoDocumento[] = [
      'Invoice',
      'Packing List',
      'Conhecimento de carga',
    ];

    return documentosObrigatorios.filter(
      (tipo) => !this.documentos.some((documento) => documento.tipo === tipo),
    );
  }

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('id');

    if (numero) {
      this.processoNumero = numero;
      this.processo = this.processosService.buscarPorNumero(numero);
    }
  }

  adicionarDocumentos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    const arquivosValidos: File[] = [];

    this.mensagensUpload = [];

    for (const arquivo of arquivos) {
      const ponto = arquivo.name.lastIndexOf('.');
      const extensao = ponto >= 0
        ? arquivo.name.slice(ponto).toLowerCase()
        : '';

      if (!this.extensoesPermitidas.includes(extensao)) {
        this.mensagensUpload.push(
          `${arquivo.name}: formato não permitido.`,
        );
        continue;
      }

      if (arquivo.size > this.tamanhoMaximoArquivo) {
        this.mensagensUpload.push(
          `${arquivo.name}: excede o limite de 20 MB.`,
        );
        continue;
      }

      arquivosValidos.push(arquivo);
    }

    const novosDocumentos: Omit<DocumentoProcesso, 'id'>[] =
      arquivosValidos.map((arquivo) => ({
        nome: arquivo.name,
        tamanho:
          arquivo.size < 1024 * 1024
            ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB`
            : `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`,
        tipo: this.identificarTipoDocumento(arquivo.name),
        status: 'Aguardando conferência',
        arquivo,
      }));

    if (novosDocumentos.length > 0) {
      this.documentosService.adicionar(
        this.processoNumero,
        novosDocumentos,
      );
    }

    input.value = '';
  }

  identificarTipoDocumento(nomeArquivo: string): TipoDocumento {
    const nome = nomeArquivo.toLowerCase().replace(/[_-]+/g, ' ');

    if (/\b(invoice|fatura)\b/.test(nome)) {
      return 'Invoice';
    }

    if (/\b(packing|romaneio)\b/.test(nome)) {
      return 'Packing List';
    }

    if (/\b(bl|bill of lading|awb|mawb|hawb|conhecimento)\b/.test(nome)) {
      return 'Conhecimento de carga';
    }

    if (/\b(certificado|certificate)\b/.test(nome)) {
      return 'Certificado';
    }

    return 'Outro';
  }

  removerDocumento(id: number): void {
    this.documentosService.remover(this.processoNumero, id);
  }

  atualizarTipoDocumento(id: number, tipo: TipoDocumento): void {
    this.documentosService.atualizarTipo(this.processoNumero, id, tipo);
  }

  atualizarDadosCarga(): void {
    if (!this.processo) {
      return;
    }

    this.processosService.atualizarDadosCarga(
      this.processoNumero,
      {
        portoOrigem: this.processo.portoOrigem,
        portoDestino: this.processo.portoDestino,
        numeroMercante: this.processo.numeroMercante,
        presencaCarga: this.processo.presencaCarga,
      },
    );
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
    })
  }

}
