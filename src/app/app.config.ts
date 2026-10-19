import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), //monitora mudanças
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled' }), //navega até o link da pagina
    ),
  ],
};
