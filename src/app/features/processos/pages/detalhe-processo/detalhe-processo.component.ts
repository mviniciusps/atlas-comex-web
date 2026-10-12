import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Processo, ProcessosService } from '../../services/processos.service';

type TipoDocumento =
  | 'Invoice'
  | 'Packing list'
  | 'Conhecimento de carga'
  | 'Certificado'
  | 'Outro';

interface DocumentoProcesso {
  nome: string,
  tamanho: string,
  tipo: TipoDocumento;
  status: string;
}

@Component({
  selector: 'app-detalhe-processo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detalhe-processo.component.html',
  styleUrl: './detalhe-processo.component.scss'
})
export class DetalheProcessoComponent implements OnInit {

  processo?: Processo;

  documentos: DocumentoProcesso[] = [];

  constructor(
    private route: ActivatedRoute,
    private processosService: ProcessosService,
  ) { }

  ngOnInit(): void {
    const numero = this.route.snapshot.paramMap.get('id');

    if (numero) {
      this.processo = this.processosService.buscarPorNumero(numero);
    }
  }

  adicionarDocumentos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);

    const novosDocumentos = arquivos.map((arquivo) => ({
      nome: arquivo.name,
      tamanho:
        arquivo.size < 1024 * 1024
          ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB`
          : `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB`,
      tipo: this.identificarTipoDocumento(arquivo.name),
      status: 'Aguardando conferência',
    }));

    this.documentos = [...this.documentos, ...novosDocumentos];
    input.value = '';
  }

  identificarTipoDocumento(nomeArquivo: string): TipoDocumento {
    const nome = nomeArquivo.toLowerCase();

    if (nome.includes('invoice') || nome.includes('fatura')) {
      return 'Invoice';
    }

    if (nome.includes('packing') || nome.includes('romaneio')) {
      return 'Packing list';
    }

    if (
      nome.includes('bl') ||
      nome.includes('awb') ||
      nome.includes('conhecimento')
    ) {
      return 'Conhecimento de carga';
    }

    if (nome.includes('certificado')) {
      return 'Certificado';
    }

    return 'Outro';
  }


  removerDocumento(indice: number): void {
    this.documentos = this.documentos.filter((_, i) => i !== indice);
  }

}
