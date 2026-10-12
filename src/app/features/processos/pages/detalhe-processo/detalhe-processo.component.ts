import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Processo, ProcessosService } from '../../services/processos.service';

@Component({
  selector: 'app-detalhe-processo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detalhe-processo.component.html',
  styleUrl: './detalhe-processo.component.scss'
})
export class DetalheProcessoComponent implements OnInit {
  processo?: Processo;

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

}
