import { Routes } from '@angular/router';
import { ListaProcessosComponent } from './features/processos/pages/lista-processos/lista-processos.component';
import { DetalheProcessoComponent } from './features/processos/pages/detalhe-processo/detalhe-processo.component';

export const routes: Routes = [
    {
        path: '',
        component: ListaProcessosComponent
    },
    {
        path: 'processos/:id',
        component: DetalheProcessoComponent,
    }
];
