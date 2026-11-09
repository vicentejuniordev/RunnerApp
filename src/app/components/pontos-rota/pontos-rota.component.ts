import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Percurso, PontoRota } from '../../models/percurso';
import { MapasService } from '../../services/mapas.service';

type Campo = 'inicio' | 'chegada';

@Component({
  selector: 'app-pontos-rota',
  imports: [FormsModule],
  templateUrl: 'pontos-rota.component.html',
  styleUrls: ['pontos-rota.component.scss'],
})
export class PontosRotaComponent {
  readonly percursoChange = output<Percurso | null>();
  private readonly mapas = inject(MapasService);
  readonly campos = [
    { id: 'inicio' as const, titulo: 'Ponto de início (A)' },
    { id: 'chegada' as const, titulo: 'Ponto de chegada (B)' },
  ];
  readonly consulta = { inicio: '', chegada: '' };
  readonly pontos = signal<Record<Campo, PontoRota | null>>({ inicio: null, chegada: null });
  readonly resultados = signal<Record<Campo, PontoRota[]>>({ inicio: [], chegada: [] });
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly status = signal('');
  private operacao = new AbortController();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.operacao.abort());
  }

  alterar(campo: Campo, texto: string): void {
    this.consulta[campo] = texto;
    this.pontos.update((pontos) => ({ ...pontos, [campo]: null }));
    this.resultados.update((resultados) => ({ ...resultados, [campo]: [] }));
    this.percursoChange.emit(null);
    this.erro.set('');
    this.status.set('');
  }

  selecionar(campo: Campo, ponto: PontoRota): void {
    this.consulta[campo] = ponto.nome;
    this.pontos.update((pontos) => ({ ...pontos, [campo]: ponto }));
    this.resultados.update((resultados) => ({ ...resultados, [campo]: [] }));
    this.percursoChange.emit(null);
    this.status.set('');
  }

  async buscar(campo: Campo): Promise<void> {
    if (this.ocupado()) return;
    this.iniciar('Buscando locais…');
    try {
      const resultados = await this.mapas.buscar(this.consulta[campo], this.operacao.signal);
      if (this.operacao.signal.aborted) return;
      this.resultados.update((anteriores) => ({ ...anteriores, [campo]: resultados }));
      this.status.set(
        resultados.length
          ? 'Selecione o local encontrado.'
          : 'Nenhum local encontrado. Inclua a cidade ou use coordenadas.',
      );
    } catch (error) {
      this.exibirErro(error);
    } finally {
      if (!this.operacao.signal.aborted) this.ocupado.set(false);
    }
  }

  async usarLocalizacao(): Promise<void> {
    if (this.ocupado()) return;
    this.iniciar('Obtendo sua localização…');
    try {
      if (!navigator.geolocation) throw new Error('Geolocalização indisponível neste dispositivo. Busque o endereço.');
      const posicao = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }),
      );
      if (this.operacao.signal.aborted) return;
      this.selecionar('inicio', {
        nome: 'Localização atual',
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      });
      this.status.set('Localização atual definida como início.');
    } catch {
      if (!this.operacao.signal.aborted)
        this.erro.set('Não foi possível obter a localização. Autorize o acesso ou busque o endereço manualmente.');
    } finally {
      if (!this.operacao.signal.aborted) this.ocupado.set(false);
    }
  }

  async gerar(): Promise<void> {
    const { inicio, chegada } = this.pontos();
    if (!inicio || !chegada || this.ocupado()) return;
    this.iniciar('Gerando trajeto a pé…');
    try {
      const percurso = await this.mapas.gerar(inicio, chegada, this.operacao.signal);
      if (this.operacao.signal.aborted) return;
      this.percursoChange.emit(percurso);
      this.status.set(`Trajeto a pé de ${(percurso.distanciaMetros / 1000).toFixed(2)} km. A: início · B: chegada.`);
    } catch (error) {
      this.exibirErro(error);
    } finally {
      if (!this.operacao.signal.aborted) this.ocupado.set(false);
    }
  }

  private iniciar(status: string): void {
    this.operacao.abort();
    this.operacao = new AbortController();
    this.ocupado.set(true);
    this.erro.set('');
    this.status.set(status);
    this.percursoChange.emit(null);
  }

  private exibirErro(error: unknown): void {
    if (!this.operacao.signal.aborted) {
      this.erro.set(error instanceof Error ? error.message : 'Não foi possível consultar os locais.');
      this.status.set('');
    }
  }
}
