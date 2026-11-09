export interface PontoRota {
  nome: string;
  latitude: number;
  longitude: number;
}

export interface Percurso {
  inicio: PontoRota;
  chegada: PontoRota;
  // GeoJSON uses longitude first, then latitude.
  coordenadas: [number, number][];
  distanciaMetros: number;
}

export function ehCoordenada(valor: unknown): valor is [number, number] {
  return (
    Array.isArray(valor) &&
    valor.length === 2 &&
    typeof valor[0] === 'number' &&
    Number.isFinite(valor[0]) &&
    Math.abs(valor[0]) <= 180 &&
    typeof valor[1] === 'number' &&
    Number.isFinite(valor[1]) &&
    Math.abs(valor[1]) <= 90
  );
}

export function ehPonto(valor: unknown): valor is PontoRota {
  if (typeof valor !== 'object' || valor === null) return false;
  const ponto = valor as Partial<PontoRota>;
  return typeof ponto.nome === 'string' && !!ponto.nome.trim() && ehCoordenada([ponto.longitude, ponto.latitude]);
}

export function ehPercurso(valor: unknown): valor is Percurso {
  if (typeof valor !== 'object' || valor === null) return false;
  const percurso = valor as Partial<Percurso>;
  return (
    ehPonto(percurso.inicio) &&
    ehPonto(percurso.chegada) &&
    typeof percurso.distanciaMetros === 'number' &&
    Number.isFinite(percurso.distanciaMetros) &&
    percurso.distanciaMetros > 0 &&
    Array.isArray(percurso.coordenadas) &&
    percurso.coordenadas.length >= 2 &&
    percurso.coordenadas.every(ehCoordenada)
  );
}
