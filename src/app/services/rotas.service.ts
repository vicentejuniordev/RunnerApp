import { Injectable, signal } from '@angular/core';

import { ehPercurso } from '../models/percurso';
import type { Percurso } from '../models/percurso';

export interface Rota {
  id: string;
  nome: string;
  foto: string | null;
  percurso?: Percurso | null;
}

const CHAVE_ROTAS = 'runnerapp.rotas.v1';

@Injectable({ providedIn: 'root' })
export class RotasService {
  private readonly lista = signal<Rota[]>(this.carregar());
  readonly rotas = this.lista.asReadonly();

  adicionar(nome: string, foto: string | null, percurso: Percurso): void {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || nomeLimpo.length > 60) {
      throw new Error('Informe um nome de até 60 caracteres.');
    }
    if (!ehPercurso(percurso)) throw new Error('Confirme o início e a chegada e gere o mapa da rota.');
    const rotas = [...this.lista(), { id: crypto.randomUUID(), nome: nomeLimpo, foto, percurso }];
    // Only update the visible list after storage succeeds, including when photos fill the quota.
    localStorage.setItem(CHAVE_ROTAS, JSON.stringify(rotas));
    this.lista.set(rotas);
  }

  private carregar(): Rota[] {
    try {
      const valor: unknown = JSON.parse(localStorage.getItem(CHAVE_ROTAS) ?? 'null');
      if (Array.isArray(valor) && valor.every((rota: unknown) => this.ehRota(rota))) {
        return valor as Rota[];
      }
    } catch {
      // Start with mock routes if local storage is unavailable or contains invalid data.
    }
    return [
      { id: 'manha', nome: 'Rota manhã', foto: null },
      { id: 'tarde', nome: 'Rota tarde', foto: null },
    ];
  }

  private ehRota(valor: unknown): valor is Rota {
    if (typeof valor !== 'object' || valor === null) return false;
    const rota = valor as Partial<Rota>;
    return (
      typeof rota.id === 'string' &&
      typeof rota.nome === 'string' &&
      !!rota.nome.trim() &&
      rota.nome.length <= 60 &&
      (rota.percurso == null || ehPercurso(rota.percurso)) &&
      (rota.foto === null || (typeof rota.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(rota.foto)))
    );
  }
}
