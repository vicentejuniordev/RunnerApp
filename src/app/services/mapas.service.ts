import { Injectable } from '@angular/core';

import { ehCoordenada, ehPercurso } from '../models/percurso';
import type { Percurso, PontoRota } from '../models/percurso';

// Public demonstration services for the classroom app. Replace these providers for large-scale use.
export const MAPAS_CONFIG = {
  busca: 'https://photon.komoot.io/api/',
  rotas: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/',
  tiles: 'https://tile.openstreetmap.org',
};

@Injectable({ providedIn: 'root' })
export class MapasService {
  private readonly buscas = new Map<string, PontoRota[]>();
  private readonly percursos = new Map<string, Percurso>();
  private ultimaRota = 0;

  async buscar(texto: string, signal: AbortSignal): Promise<PontoRota[]> {
    const consulta = texto.trim();
    const coordenadas = consulta.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordenadas) {
      const latitude = Number(coordenadas[1]);
      const longitude = Number(coordenadas[2]);
      if (!ehCoordenada([longitude, latitude]))
        throw new Error('As coordenadas estão fora dos limites de latitude e longitude.');
      return [{ nome: consulta, latitude, longitude }];
    }
    if (consulta.length < 3) throw new Error('Digite um endereço com a cidade, ou latitude, longitude.');
    const cache = this.buscas.get(consulta);
    if (cache) return cache;
    const url = new URL(MAPAS_CONFIG.busca);
    url.search = new URLSearchParams({ q: consulta, limit: '5' }).toString();
    const dados = await this.consultar<{
      features?: { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }[];
    }>(url.toString(), signal);
    const pontos: PontoRota[] = [];
    for (const item of dados.features ?? []) {
      const coordenada = item.geometry?.coordinates;
      if (!ehCoordenada(coordenada)) continue;
      const props = item.properties ?? {};
      const partes = ['name', 'street', 'housenumber', 'city', 'state', 'country']
        .map((chave) => props[chave])
        .filter((parte): parte is string => typeof parte === 'string' && !!parte);
      pontos.push({
        nome: [...new Set(partes)].join(', ') || consulta,
        longitude: coordenada[0],
        latitude: coordenada[1],
      });
    }
    this.buscas.set(consulta, pontos);
    return pontos;
  }

  async gerar(inicio: PontoRota, chegada: PontoRota, signal: AbortSignal): Promise<Percurso> {
    if (inicio.latitude === chegada.latitude && inicio.longitude === chegada.longitude) {
      throw new Error('Escolha pontos de início e chegada diferentes.');
    }
    const chave = `${inicio.longitude},${inicio.latitude};${chegada.longitude},${chegada.latitude}`;
    const cache = this.percursos.get(chave);
    if (cache) return { ...cache, inicio, chegada };
    if (Date.now() - this.ultimaRota < 1000) throw new Error('Aguarde um instante antes de gerar outro trajeto.');
    this.ultimaRota = Date.now();
    const dados = await this.consultar<{
      code?: string;
      routes?: { distance: number; geometry?: { coordinates: unknown } }[];
    }>(`${MAPAS_CONFIG.rotas}${chave}?overview=simplified&geometries=geojson&steps=false`, signal);
    const rota = dados.routes?.[0];
    const percurso: unknown = {
      inicio,
      chegada,
      distanciaMetros: rota?.distance,
      coordenadas: rota?.geometry?.coordinates,
    };
    if (dados.code !== 'Ok' || !ehPercurso(percurso))
      throw new Error('Não foi encontrado um trajeto a pé entre esses pontos. Escolha outros locais.');
    this.percursos.set(chave, percurso);
    return percurso;
  }

  private async consultar<T>(url: string, signal: AbortSignal): Promise<T> {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      if (!resposta.ok) throw new Error('Serviço indisponível.');
      return (await resposta.json()) as T;
    } catch {
      throw new Error('Não foi possível consultar o mapa. Verifique a internet e tente novamente.');
    }
  }
}
