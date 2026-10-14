import { Injectable } from '@angular/core';

export interface EventoProcesso {
  id: number;
  descricao: string;
  data: Date;
}

@Injectable({
  providedIn: 'root',
})
export class HistoricoProcessoService {
  private eventosPorProcesso = new Map<string, EventoProcesso[]>();
  private proximoId = 1;

  listar(numeroProcesso: string): EventoProcesso[] {
    return this.eventosPorProcesso.get(numeroProcesso) ?? [];
  }

  registrar(numeroProcesso: string, descricao: string): void {
    const eventosAtuais = this.listar(numeroProcesso);
    const novoEvento: EventoProcesso = {
      id: this.proximoId++,
      descricao,
      data: new Date(),
    };

    this.eventosPorProcesso.set(numeroProcesso, [
      novoEvento,
      ...eventosAtuais,
    ]);
  }
}