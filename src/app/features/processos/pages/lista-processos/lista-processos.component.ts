import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lista-processos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lista-processos.component.html',
  styleUrl: './lista-processos.component.scss'
})
export class ListaProcessosComponent {

  termoBusca = '';
  formularioAberto = false;

  novoProcesso = {
    numero: '',
    importador: '',
    modalidade: 'Marítimo',
    conhecimento: '',
    chegada: '',
  }

  processos = [
    {
      numero: 'IMP-2026-001',
      importador: 'Empresa Exemplo Ltda.',
      modalidade: 'Marítimo',
      conhecimento: 'BL MSCU1234567',
      chegada: '18/10/2026',
      etapa: 'Conferência de carga',
      status: 'Em andamento',
      statusClass: 'andamento',
    },
    {
      numero: 'IMP-2026-002',
      importador: 'Comercial Sul S.A.',
      modalidade: 'Aéreo',
      conhecimento: 'MAWB 123-45678901',
      chegada: '20/10/2026',
      etapa: 'Aguardando documentos',
      status: 'Pendente',
      statusClass: 'pendente',
    },
    {
      numero: 'IMP-2026-003',
      importador: 'Indústria Horizonte Ltda.',
      modalidade: 'Marítimo',
      conhecimento: 'BL HLCU7654321',
      chegada: '22/10/2026',
      etapa: 'Preenchimento da DUIMP',
      status: 'Em andamento',
      statusClass: 'andamento',
    }
  ]

  abrirFormulario(): void {
    this.formularioAberto = true;
  }

  cancelarFormulario(): void {
    this.formularioAberto = false;
    this.novoProcesso = {
      numero: '',
      importador: '',
      modalidade: 'Marítimo',
      conhecimento: '',
      chegada: '',
    }
  }

  adicionarProcesso(): void {
    const { numero, importador, conhecimento, chegada, modalidade } = this.novoProcesso;

    if (!numero.trim() || !importador.trim()) {
      return;
    }

    this.processos = [
      {
        numero: numero.trim(),
        importador: importador.trim(),
        modalidade,
        conhecimento: conhecimento.trim(),
        chegada,
        etapa: 'Cadastro inicial',
        status: 'Em andamento',
        statusClass: 'andamento',
      },
      ...this.processos,
    ];

    this.cancelarFormulario();
  }

  get processosFiltrados() {
    const termo = this.termoBusca.trim().toLowerCase();

    if (!termo) {
      return this.processos;
    }

    return this.processos.filter((processo) =>
      [
        processo.numero,
        processo.importador,
        processo.modalidade,
        processo.conhecimento,
        processo.chegada,
        processo.etapa,
        processo.status,
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
