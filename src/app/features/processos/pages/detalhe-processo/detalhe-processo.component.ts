import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import type {
  DocumentoProcesso,
  StatusConferenciaDocumento,
  TipoDocumento,
} from '../../models/documento-processo.model';
import { DocumentosService } from '../../services/documentos.service';
import { Processo } from '../../models/processo.model';
import { ProcessosService } from '../../services/processos.service';
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
  documentos: DocumentoProcesso[] = [];
  carregandoDocumentos = false;

  readonly tiposDocumentoDisponiveis: TipoDocumento[] = [
    'Invoice',
    'Packing List',
    'Conhecimento de carga',
    'Certificado',
    'Outro'
  ];

  readonly statusConferenciaDisponiveis: StatusConferenciaDocumento[] = [
    'Aguardando conferência',
    'Conferido',
    'Com divergência'
  ]

  private readonly extensoesPermitidas = [
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

  private readonly tamanhoMaximoArquivo = 25 * 1024 * 1024;

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
    private documentosService: DocumentosService,
    private historicoProcessoService: HistoricoProcessoService,
  ) { }

  get eventosHistorico(): EventoProcesso[] {
    return this.historicoProcessoService.listar(this.processoNumero);
  }

  get documentosIncluidosNaDuimp(): number {
    return this.documentos.filter((documento) => documento.incluirNaDuimp).length;
  }

  get documentosPendentes(): TipoDocumento[] {
    const documentosObrigatorios: TipoDocumento[] = [
      'Invoice',
      'Packing List',
      'Conhecimento de carga',
    ];

    return documentosObrigatorios.filter(
      (tipo) =>
        !this.documentos.some((documento) => documento.tipoDocumento === tipo),
    );
  }

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('id');

    if (numero) {
      this.processoNumero = numero;
      this.processo = this.processosService.buscarPorNumero(numero);
      this.atualizarDocumentos();
    }
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
        this.mensagensUpload = [
          'Não foi possível carregar os documentos do processo.',
        ];
        this.carregandoDocumentos = false;
      },
    });
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

    this.enviarArquivos(arquivosValidos);

    input.value = '';
  }

  private enviarArquivos(arquivos: File[]): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined || arquivos.length === 0) return;

    const chavesExistentes = new Set(
      this.documentos.map((documento) =>
        this.criarChaveArquivo(documento.nomeArquivo, documento.tamanhoBytes),
      ),
    );
    const arquivosSemDuplicidade = arquivos.filter((arquivo) => {
      const chave = this.criarChaveArquivo(arquivo.name, arquivo.size);

      if (chavesExistentes.has(chave)) {
        this.mensagensUpload.push(`${arquivo.name}: já anexado ao processo.`);
        return false;
      }

      chavesExistentes.add(chave);
      return true;
    });

    if (arquivosSemDuplicidade.length === 0) return;

    this.carregandoDocumentos = true;
    const envios = arquivosSemDuplicidade.map((arquivo) =>
      this.documentosService
        .enviar(idProcesso, arquivo, this.identificarTipoDocumento(arquivo.name))
        .pipe(catchError(() => of(null))),
    );

    forkJoin(envios).subscribe((resultados) => {
      const enviados = resultados.filter(
        (documento): documento is DocumentoProcesso => documento !== null,
      );
      const falhas = resultados.length - enviados.length;

      this.documentos = [...enviados, ...this.documentos];
      this.carregandoDocumentos = false;

      for (const documento of enviados) {
        this.historicoProcessoService.registrar(
          this.processoNumero,
          `Documento incluído: ${documento.nomeArquivo} (${documento.tipoDocumento})`,
        );
      }

      if (enviados.length > 0) {
        this.mensagensUpload.push(
          `${enviados.length} documento(s) enviado(s) ao processo.`,
        );
      }
      if (falhas > 0) {
        this.mensagensUpload.push(`${falhas} envio(s) falharam.`);
      }
    });
  }

  formatarTamanhoArquivo(tamanhoBytes: number): string {
    if (tamanhoBytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(tamanhoBytes / 1024))} KB`;
    }

    return `${(tamanhoBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private criarChaveArquivo(nome: string, tamanho: number): string {
    return `${nome.trim().toLocaleLowerCase()}-${tamanho}`;
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

  atualizarTipoDocumento(
    documento: DocumentoProcesso,
    tipoDocumento: TipoDocumento,
  ): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) return;

    this.documentosService
      .atualizarTipo(idProcesso, documento.idDocumento, tipoDocumento)
      .subscribe({
        next: () => {
          this.historicoProcessoService.registrar(
            this.processoNumero,
            `Tipo do documento atualizado: ${documento.nomeArquivo}`,
          );
        },
        error: () => {
          this.mensagensUpload = [
            'Não foi possível atualizar o tipo do documento.',
          ];
          this.atualizarDocumentos();
        },
      });
  }

  atualizarStatusDocumento(
    documento: DocumentoProcesso,
    statusConferencia: StatusConferenciaDocumento,
  ): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) return;

    this.documentosService
      .atualizarStatusConferencia(
        idProcesso,
        documento.idDocumento,
        statusConferencia,
      )
      .subscribe({
        next: () => {
          this.historicoProcessoService.registrar(
            this.processoNumero,
            `Conferência atualizada: ${documento.nomeArquivo} — ${statusConferencia}`,
          );
        },
        error: () => {
          this.mensagensUpload = [
            'Não foi possível atualizar a conferência do documento.',
          ];
          this.atualizarDocumentos();
        },
      });
  }

  excluirDocumento(documento: DocumentoProcesso): void {
    const idProcesso = this.processo?.idProcesso;

    if (idProcesso === undefined) return;

    const confirmou = window.confirm(
      `Deseja excluir o documento "${documento.nomeArquivo}"?`,
    );

    if (!confirmou) return;

    this.documentosService
      .excluir(idProcesso, documento.idDocumento)
      .subscribe({
        next: () => {
          this.documentos = this.documentos.filter(
            (item) => item.idDocumento !== documento.idDocumento,
          );

          this.historicoProcessoService.registrar(
            this.processoNumero,
            `Documento excluído: ${documento.nomeArquivo}`,
          );
        },
        error: () => {
          this.mensagensUpload = [
            'Não foi possível excluir o documento.',
          ];
        },
      });
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
