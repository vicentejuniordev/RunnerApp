import { Component, input } from '@angular/core';

import { formatarRitmo, formatarTempo } from '../../models/corrida';

@Component({
  selector: 'app-metricas-corrida',
  template: `
    <dl aria-label="Métricas da corrida">
      <div>
        <dt>Tempo</dt>
        <dd>{{ tempo(duracao()) }}</dd>
      </div>
      <div>
        <dt>Distância</dt>
        <dd>{{ (distancia() / 1000).toFixed(2) }} km</dd>
      </div>
      <div>
        <dt>Ritmo médio</dt>
        <dd>{{ ritmo(distancia(), duracao()) }} min/km</dd>
      </div>
      <div>
        <dt>Calorias estimadas</dt>
        <dd>{{ calorias() }} kcal</dd>
      </div>
      <div>
        <dt>Passos estimados</dt>
        <dd>{{ passos() }}</dd>
      </div>
    </dl>
  `,
  styles: `
    dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 20px 0;
    }
    div {
      padding: 12px;
      background: #edf2ff;
      border-radius: 9px;
    }
    dt {
      color: #4e5a70;
      font-size: 12px;
    }
    dd {
      margin: 6px 0 0;
      font-size: 18px;
      font-weight: 600;
      color: #182b50;
    }
  `,
})
export class MetricasCorridaComponent {
  readonly distancia = input.required<number>();
  readonly duracao = input.required<number>();
  readonly passos = input.required<number>();
  readonly calorias = input.required<number>();
  readonly tempo = formatarTempo;
  readonly ritmo = formatarRitmo;
}
