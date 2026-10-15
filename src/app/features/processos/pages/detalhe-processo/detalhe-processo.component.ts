import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
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
import {
  EventoProcesso,
  HistoricoProcessoService,
} from '../../services/historico-processo.service';

@Component({
  selector: 'app-detalhe-processo',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
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
    private historicoProcessoService: HistoricoProcessoService,
  ) { }

  get documentos(): DocumentoProcesso[] {
    return this.documentosService.listar(this.processoNumero);
  }

  get eventosHistorico(): EventoProcesso[] {
    return this.historicoProcessoService.listar(this.processoNumero);
  }

  get documentosAguardandoConferencia(): number {
    return this.documentos.filter((documento) => documento.status === 'Aguardando conferência').length;
  }

  get documentosConferidos(): number {
    return this.documentos.filter(
      (documento) => documento.status === 'Conferido'
    ).length;
  }

  get documentosComDivergencia(): number {
    return this.documentos.filter(
      (documento) => documento.status === 'Com divergência'
    ).length;
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

      for (const documento of novosDocumentos) {
        this.historicoProcessoService.registrar(
          this.processoNumero,
          'Documento incluído: ' + documento.nome + ' (' + documento.tipo + ')',
        );
      }
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
    const documento = this.documentos.find((item) => item.id === id);

    if (!documento) {
      return;
    }
  }

  atualizarTipoDocumento(id: number, tipo: TipoDocumento): void {
    const documento = this.documentos.find((item) => item.id === id);

    if (!documento || documento.tipo === tipo) {
      return;
    }

    this.documentosService.atualizarTipo(this.processoNumero, id, tipo);
    this.historicoProcessoService.registrar(
      this.processoNumero,
      'Tipo do documento ' + documento.nome + ' alterado de ' +
      documento.tipo + ' para ' + tipo,
    );
  }

  atualizarStatusDocumento(
    id: number,
    status: DocumentoProcesso['status'],
  ): void {
    const documento = this.documentos.find((item) => item.id === id);

    if (!documento || documento.status === status) {
      return;
    }

    this.documentosService.atualizarStatus(
      this.processoNumero,
      id,
      status,
    );

    this.historicoProcessoService.registrar(
      this.processoNumero,
      'Conferência de ' + documento.nome + ': ' + status,
    );
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

}
