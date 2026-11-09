import { Injectable, signal } from '@angular/core';

import type { Corrida } from '../models/corrida';
import { ehCoordenada, ehPercurso } from '../models/percurso';

const CHAVE = 'runnerapp.corridas.v1';

@Injectable({ providedIn: 'root' })
export class CorridasService {
  private readonly lista = signal<Corrida[]>(this.carregar());
  readonly corridas = this.lista.asReadonly();

  salvar(corrida: Corrida): void {
    if (!this.valida(corrida)) throw new Error('Registro de corrida inválido.');
    const lista = [corrida, ...this.lista().filter((item) => item.id !== corrida.id)];
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    this.lista.set(lista);
  }

  private carregar(): Corrida[] {
    try {
      const dados: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
      if (Array.isArray(dados)) return dados.filter((item: unknown): item is Corrida => this.valida(item));
    } catch {
      /* Use examples when storage is unavailable. */
    }
    return [1, 2, 3].map((id) => ({
      id: `exemplo-${id}`,
      rotaId: '',
      nome: 'Corrida matinal',
      inicio: new Date(2026, 10, 1, 6).toISOString(),
      fim: new Date(2026, 10, 1, 8).toISOString(),
      distanciaMetros: 24000,
      duracaoSegundos: 7200,
      passos: 0,
      pesoKg: 70,
      calorias: 50,
      foto: null,
      percurso: null,
      trilha: [],
      exemplo: true,
    }));
  }

  private valida(valor: unknown): valor is Corrida {
    if (typeof valor !== 'object' || valor === null) return false;
    const c = valor as Partial<Corrida>;
    return (
      typeof c.id === 'string' &&
      typeof c.rotaId === 'string' &&
      typeof c.nome === 'string' &&
      !!c.nome.trim() &&
      typeof c.inicio === 'string' &&
      Number.isFinite(Date.parse(c.inicio)) &&
      typeof c.fim === 'string' &&
      Number.isFinite(Date.parse(c.fim)) &&
      [c.distanciaMetros, c.duracaoSegundos, c.passos, c.pesoKg, c.calorias].every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0,
      ) &&
      (c.percurso === null || ehPercurso(c.percurso)) &&
      Array.isArray(c.trilha) &&
      c.trilha.every(ehCoordenada) &&
      (c.foto === null || (typeof c.foto === 'string' && /^data:image\/jpeg;base64,/.test(c.foto)))
    );
  }
}
