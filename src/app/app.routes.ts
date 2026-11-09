import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },

  {
    path: 'inicial',
    loadComponent: () => import('./pages/Inicial/inicial.page').then((m) => m.InicialPage),
  },

  {
    path: 'rotas',
    loadComponent: () => import('./pages/rotas/rotas.page').then((m) => m.RotasPage),
  },

  {
    path: 'corridas',
    loadComponent: () => import('./pages/corridas/corridas.page').then((m) => m.CorridasPage),
  },
  {
    path: 'corrida/:rotaId',
    loadComponent: () => import('./pages/corrida/corrida.page').then((m) => m.CorridaPage),
    canDeactivate: [(component: { podeSair: () => boolean }): boolean => component.podeSair()],
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
