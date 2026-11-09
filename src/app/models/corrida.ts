import type { Percurso } from './percurso';

export interface Corrida {
  id: string;
  rotaId: string;
  nome: string;
  inicio: string;
  fim: string;
  distanciaMetros: number;
  duracaoSegundos: number;
  passos: number;
  pesoKg: number;
  calorias: number;
  foto: string | null;
  percurso: Percurso | null;
  trilha: [number, number][];
  exemplo?: boolean;
}

export function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((parte) => String(parte).padStart(2, '0'))
    .join(':');
}

export function formatarRitmo(distanciaMetros: number, segundos: number): string {
  if (distanciaMetros < 10 || segundos <= 0) return '—';
  const ritmo = Math.round(segundos / (distanciaMetros / 1000));
  return `${Math.floor(ritmo / 60)}:${String(ritmo % 60).padStart(2, '0')}`;
}

export function distanciaGPS(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const deltaLat = (b[1] - a[1]) * rad;
  const deltaLon = (b[0] - a[0]) * rad;
  const seno = Math.sin(deltaLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(deltaLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, seno)));
}
