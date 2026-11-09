import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Rota } from '../../services/rotas.service';
import { MapaRotaComponent } from '../mapa-rota/mapa-rota.component';

@Component({
  selector: 'app-cartao-rota',
  imports: [MapaRotaComponent, RouterLink],
  template: `
    <article>
      @if (rota().foto) {
        <img [src]="rota().foto" [alt]="'Foto da ' + rota().nome" />
      } @else if (rota().percurso; as percurso) {
        <app-mapa-rota [percurso]="percurso" />
      } @else {
        <div class="fundo-padrao">Maps Image</div>
      }
      @if (navegavel()) {
        <a routerLink="/rotas" [attr.aria-label]="rota().nome + ', ver minhas rotas'"
          ><h2>{{ rota().nome }}</h2></a
        >
      } @else {
        <h2>{{ rota().nome }}</h2>
      }
      @if (rota().percurso; as percurso) {
        <div class="pontos">
          <p><strong>A:</strong> {{ percurso.inicio.nome }}</p>
          <p><strong>B:</strong> {{ percurso.chegada.nome }}</p>
          <p>{{ (percurso.distanciaMetros / 1000).toFixed(2) }} km · Trajeto a pé</p>
        </div>
        @if (!navegavel()) {
          <a class="iniciar" [routerLink]="['/corrida', rota().id]" [attr.aria-label]="'Iniciar rota ' + rota().nome"
            >Iniciar rota</a
          >
        }
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    article {
      overflow: hidden;
      border: 1px solid #555;
      border-radius: 8px;
      background: #fff;
      color: #080808;
    }
    img,
    .fundo-padrao {
      display: grid;
      place-items: center;
      width: 100%;
      height: 62px;
      object-fit: cover;
      font-size: 14px;
      font-weight: 500;
    }
    h2 {
      overflow-wrap: anywhere;
      margin: 0;
      padding: 7px 8px 5px;
      background: #5785f7;
      color: #fff;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
    }
    a {
      text-decoration: none;
    }
    .iniciar {
      display: block;
      padding: 10px;
      text-align: center;
      color: #244ba5;
      background: #edf2ff;
      font-size: 13px;
    }
    a:focus-visible {
      outline: 2px solid #244ba5;
      outline-offset: -2px;
    }
    .pontos {
      padding: 6px 8px;
    }
    p {
      overflow-wrap: anywhere;
      margin: 3px 0;
      font-size: 11px;
      line-height: 1.4;
    }
  `,
})
export class CartaoRotaComponent {
  readonly rota = input.required<Rota>();
  readonly navegavel = input(false);
}
