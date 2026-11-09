import type { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page')
        .then((m) => m.HomePage),
  },

  {
    path: 'inicial',
    loadComponent: () =>
      import('./pages/Inicial/inicial.page')
        .then((m) => m.InicialPage),
  },

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

];
