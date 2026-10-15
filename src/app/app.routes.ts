import { Routes } from '@angular/router';
import { ListaProcessosComponent } from './features/processos/pages/lista-processos/lista-processos.component';
import { DetalheProcessoComponent } from './features/processos/pages/detalhe-processo/detalhe-processo.component';
import { DuimpComponent } from './features/duimp/pages/duimp/duimp.component';

export const routes: Routes = [
    {
        path: '',
        component: ListaProcessosComponent
    },
    {
        path: 'processos/:id/duimp',
        component: DuimpComponent,
    },
    {
        path: 'processos/:id',
        component: DetalheProcessoComponent,
    }
];
