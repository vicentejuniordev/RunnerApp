import { Component, input } from '@angular/core';

import { formatarRitmo, formatarTempo } from '../../models/corrida';
import type { Corrida } from '../../models/corrida';

@Component({
  selector: 'app-cartao-corrida',
  template: `
    <div class="cartao">
      @if (corrida().foto) {
        <img [src]="corrida().foto" alt="" />
      } @else {
        <span class="circulo" aria-hidden="true"></span>
      }
      <div class="texto">
        <h3>{{ corrida().nome }}</h3>
        <p>
          {{ ritmo(corrida().distanciaMetros, corrida().duracaoSegundos) }} min/km |
          {{ tempo(corrida().duracaoSegundos) }}
        </p>
        @if (corrida().exemplo) {
          <small>Exemplo</small>
        }
      </div>
      <span class="calorias">{{ corrida().calorias }} kcal</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: #080808;
    }
    .cartao {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 55px;
      padding: 10px 12px;
      border-radius: 9px;
      background: #efefef;
      text-align: left;
    }
    img,
    .circulo {
      flex: 0 0 28px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      background: #d9d9d9;
    }
    .texto {
      flex: 1;
      min-width: 0;
    }
    h3,
    p {
      margin: 0;
      font-size: 10px;
      font-weight: 400;
    }
    h3 {
      overflow-wrap: anywhere;
    }
    .calorias {
      white-space: nowrap;
      font-size: 10px;
    }
    small {
      font-size: 9px;
      color: #666;
    }
  `,
})
export class CartaoCorridaComponent {
  readonly corrida = input.required<Corrida>();
  readonly tempo = formatarTempo;
  readonly ritmo = formatarRitmo;
}
