import { Component, computed, effect, input, signal } from '@angular/core';

import type { Percurso } from '../../models/percurso';
import { MAPAS_CONFIG } from '../../services/mapas.service';

const LARGURA = 600;
const ALTURA = 300;

function projetar(longitude: number, latitude: number): [number, number] {
  const seno = Math.sin((Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI) / 180);
  return [(longitude + 180) / 360, 0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)];
}

@Component({
  selector: 'app-mapa-rota',
  template: `
    <div class="mapa">
      <svg
        viewBox="0 0 600 300"
        role="img"
        [attr.aria-label]="'Mapa do trajeto de ' + percurso().inicio.nome + ' até ' + percurso().chegada.nome"
      >
        <rect width="600" height="300" fill="#e9eee8" />
        @for (tile of desenho().tiles; track tile.url) {
          <image
            [attr.href]="tile.url"
            [attr.x]="tile.x"
            [attr.y]="tile.y"
            width="256"
            height="256"
            (error)="falhaMapa.set(true)"
          />
        }
        <polyline
          [attr.points]="desenho().linha"
          fill="none"
          stroke="white"
          stroke-width="12"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <polyline
          [attr.points]="desenho().linha"
          fill="none"
          stroke="#376bea"
          stroke-width="7"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        @for (marcador of desenho().marcadores; track marcador.nome) {
          <circle
            [attr.cx]="marcador.x"
            [attr.cy]="marcador.y"
            r="17"
            [attr.fill]="marcador.nome === 'A' ? '#168253' : '#bf3737'"
            stroke="white"
            stroke-width="3"
          />
          <text
            [attr.x]="marcador.x"
            [attr.y]="marcador.y + 6"
            text-anchor="middle"
            fill="white"
            font-size="18"
            font-weight="bold"
          >
            {{ marcador.nome }}
          </text>
        }
        @if (desenho().linhaReal) {
          <polyline
            [attr.points]="desenho().linhaReal"
            fill="none"
            stroke="#168253"
            stroke-width="7"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        }
        @if (desenho().atual; as atual) {
          <circle [attr.cx]="atual.x" [attr.cy]="atual.y" r="9" fill="#168253" stroke="white" stroke-width="3" />
        }
      </svg>
      @if (falhaMapa()) {
        <p role="status">Traçado salvo; mapa de fundo indisponível.</p>
      }
      <div class="creditos">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
        · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Corrigir mapa</a>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .mapa {
      position: relative;
      overflow: hidden;
      background: #e9eee8;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .creditos {
      padding: 3px 5px;
      text-align: right;
      background: #fff;
      font:
        10px Arial,
        sans-serif;
    }
    a {
      color: #345077;
    }
    p {
      margin: 0;
      padding: 4px;
      font-size: 11px;
      color: #713f12;
      background: #fff7dc;
    }
  `,
})
export class MapaRotaComponent {
  readonly percurso = input.required<Percurso>();
  readonly trilha = input<[number, number][]>([]);
  readonly falhaMapa = signal(false);
  readonly desenho = computed(() => {
    const percurso = this.percurso();
    const inicio = projetar(percurso.inicio.longitude, percurso.inicio.latitude);
    // Unwrap longitudes around the start so routes across the date line still fit the view.
    const ajustar = ([x, y]: [number, number]): [number, number] => [x - Math.round(x - inicio[0]), y];
    const chegada = ajustar(projetar(percurso.chegada.longitude, percurso.chegada.latitude));
    const pontos = percurso.coordenadas.map(([lon, lat]) => ajustar(projetar(lon, lat)));
    const reais = this.trilha().map(([lon, lat]) => ajustar(projetar(lon, lat)));
    const todos = [...pontos, inicio, chegada, ...reais];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of todos) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    let zoom = 17;
    while (
      zoom > 0 &&
      ((maxX - minX) * 256 * 2 ** zoom > LARGURA - 100 || (maxY - minY) * 256 * 2 ** zoom > ALTURA - 90)
    )
      zoom--;
    const escala = 256 * 2 ** zoom;
    const esquerda = ((minX + maxX) / 2) * escala - LARGURA / 2;
    const topo = ((minY + maxY) / 2) * escala - ALTURA / 2;
    const pixel = ([x, y]: [number, number]) => ({ x: x * escala - esquerda, y: y * escala - topo });
    const tiles = [];
    for (let x = Math.floor(esquerda / 256); x <= Math.floor((esquerda + LARGURA) / 256); x++) {
      for (let y = Math.floor(topo / 256); y <= Math.floor((topo + ALTURA) / 256); y++) {
        if (y < 0 || y >= 2 ** zoom) continue;
        const tileX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
        tiles.push({
          url: `${MAPAS_CONFIG.tiles}/${zoom}/${tileX}/${y}.png`,
          x: x * 256 - esquerda,
          y: y * 256 - topo,
        });
      }
    }
    return {
      tiles,
      linhaReal: reais
        .map((ponto) => {
          const p = pixel(ponto);
          return `${p.x},${p.y}`;
        })
        .join(' '),
      atual: reais.length ? pixel(reais[reais.length - 1]) : null,
      linha: pontos
        .map((ponto) => {
          const p = pixel(ponto);
          return `${p.x},${p.y}`;
        })
        .join(' '),
      marcadores: [
        { ...pixel(inicio), nome: 'A' },
        { ...pixel(chegada), nome: 'B' },
      ],
    };
  });

  constructor() {
    effect(() => {
      this.percurso();
      this.falhaMapa.set(false);
    });
  }
}
