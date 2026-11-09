import { computed, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { Position } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import type { AccelListenerEvent } from '@capacitor/motion';

import { distanciaGPS } from '../models/corrida';
import type { Corrida } from '../models/corrida';
import { ehCoordenada } from '../models/percurso';

import type { Rota } from './rotas.service';

// Provided per page so a discarded session cannot affect a later run.
@Injectable()
export class AcompanhamentoService {
  readonly estado = signal<'pronto' | 'iniciando' | 'correndo' | 'finalizada'>('pronto');
  readonly duracao = signal(0);
  readonly distancia = signal(0);
  readonly passos = signal(0);
  readonly trilha = signal<[number, number][]>([]);
  readonly avisoGPS = signal('');
  readonly avisoMovimento = signal('Aguardando acelerômetro.');
  readonly peso = signal(70);
  // Approximate running cost: 1 kcal per kg per km; see docs/corridas.md.
  readonly calorias = computed(() => Math.round((this.peso() * this.distancia()) / 1000));
  private watch: string | null = null;
  private movimento: PluginListenerHandle | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private geracao = 0;
  private inicio = 0;
  private id = '';
  private ultimoGPS: Position | null = null;
  private gravidade = 9.81;
  private ultimoPasso = -Infinity;
  private pico = false;

  async iniciar(peso: number): Promise<void> {
    if (this.estado() !== 'pronto') return;
    if (!Number.isFinite(peso) || peso < 20 || peso > 300) throw new Error('Informe um peso entre 20 e 300 kg.');
    const geracao = ++this.geracao;
    this.estado.set('iniciando');
    // Request iOS motion permission in the original button gesture, before awaiting GPS.
    const permissaoMovimento = this.permitirMovimento();
    try {
      if (Capacitor.isNativePlatform()) await Geolocation.requestPermissions({ permissions: ['location'] });
      const posicao = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      if (geracao !== this.geracao) return;
      if (!this.gpsValido(posicao))
        throw new Error('O GPS ainda está impreciso. Vá para um local aberto e tente novamente.');
      this.inicio = Date.now();
      this.id = crypto.randomUUID();
      this.peso.set(peso);
      this.estado.set('correndo');
      this.receberGPS(posicao);
      this.timer = setInterval(() => this.atualizarTempo(), 1000);
      const watch = await Geolocation.watchPosition(
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000, minimumUpdateInterval: 2000 },
        (pos, error) => {
          if (geracao !== this.geracao || this.estado() !== 'correndo') return;
          if (error || !pos) {
            this.avisoGPS.set('Sinal de GPS indisponível. A distância só aumenta com posições válidas.');
            this.ultimoGPS = null;
            return;
          }
          this.receberGPS(pos);
        },
      );
      if (geracao !== this.geracao) {
        await Geolocation.clearWatch({ id: watch });
        return;
      }
      this.watch = watch;
      if (await permissaoMovimento) {
        if (geracao !== this.geracao) return;
        const handle = await Motion.addListener('accel', (evento) => {
          if (geracao === this.geracao && this.estado() === 'correndo') this.receberMovimento(evento);
        });
        if (geracao !== this.geracao) await handle.remove();
        else this.movimento = handle;
      } else this.avisoMovimento.set('Acelerômetro indisponível ou sem permissão. O GPS continua ativo.');
    } catch (error) {
      if (geracao !== this.geracao) return;
      if (this.estado() === 'correndo') {
        this.avisoGPS.set('Não foi possível manter os sensores ativos. Finalize e tente novamente.');
      } else {
        this.estado.set('pronto');
        throw new Error(
          error instanceof Error && error.message.includes('impreciso')
            ? error.message
            : 'Não foi possível obter o GPS. Autorize a localização e tente novamente.',
          { cause: error },
        );
      }
    }
  }

  finalizar(rota: Rota): Corrida {
    if (this.estado() === 'correndo') this.atualizarTempo();
    this.estado.set('finalizada');
    void this.pararSensores();
    return {
      id: this.id,
      rotaId: rota.id,
      nome: rota.nome,
      inicio: new Date(this.inicio).toISOString(),
      fim: new Date().toISOString(),
      distanciaMetros: this.distancia(),
      duracaoSegundos: this.duracao(),
      passos: this.passos(),
      pesoKg: this.peso(),
      calorias: this.calorias(),
      foto: null,
      percurso: rota.percurso ?? null,
      trilha: this.trilha(),
    };
  }

  async limpar(): Promise<void> {
    this.estado.set('pronto');
    const parada = this.pararSensores();
    this.duracao.set(0);
    this.distancia.set(0);
    this.passos.set(0);
    this.trilha.set([]);
    this.ultimoGPS = null;
    this.gravidade = 9.81;
    this.ultimoPasso = -Infinity;
    this.pico = false;
    this.avisoGPS.set('');
    this.avisoMovimento.set('Aguardando acelerômetro.');
    await parada;
  }

  private atualizarTempo(): void {
    this.duracao.set(Math.max(0, Math.floor((Date.now() - this.inicio) / 1000)));
  }

  private async pararSensores(): Promise<void> {
    this.geracao++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const watch = this.watch;
    this.watch = null;
    const movimento = this.movimento;
    this.movimento = null;
    await Promise.allSettled([
      watch !== null ? Geolocation.clearWatch({ id: watch }) : Promise.resolve(),
      movimento?.remove() ?? Promise.resolve(),
    ]);
  }

  private gpsValido(pos: Position): boolean {
    return (
      ehCoordenada([pos.coords.longitude, pos.coords.latitude]) &&
      Number.isFinite(pos.timestamp) &&
      Number.isFinite(pos.coords.accuracy) &&
      pos.coords.accuracy >= 0 &&
      pos.coords.accuracy <= 40
    );
  }

  private receberGPS(pos: Position): void {
    if (!this.gpsValido(pos)) {
      this.avisoGPS.set('GPS impreciso. Aguardando um sinal melhor.');
      this.ultimoGPS = null;
      return;
    }
    const atual: [number, number] = [pos.coords.longitude, pos.coords.latitude];
    if (this.ultimoGPS) {
      const anterior = this.ultimoGPS;
      const segundos = (pos.timestamp - anterior.timestamp) / 1000;
      if (segundos <= 0) return;
      const metros = distanciaGPS([anterior.coords.longitude, anterior.coords.latitude], atual);
      // Suppress stationary jitter and implausible jumps. Do not bridge long GPS gaps.
      if (segundos <= 60) {
        if (metros / segundos > 12) {
          this.avisoGPS.set('Oscilação do GPS ignorada.');
          return;
        }
        if (metros < Math.max(3, Math.min(10, pos.coords.accuracy / 2))) return;
        this.distancia.update((distancia) => distancia + metros);
      }
    }
    this.ultimoGPS = pos;
    this.avisoGPS.set('');
    this.trilha.update((pontos) => [...pontos, atual]);
  }

  private receberMovimento(evento: AccelListenerEvent): void {
    const valores = evento.accelerationIncludingGravity;
    if (!valores || ![valores.x, valores.y, valores.z].every((n) => typeof n === 'number' && Number.isFinite(n)))
      return;
    this.avisoMovimento.set('Acelerômetro ativo · passos estimados.');
    const magnitude = Math.hypot(valores.x, valores.y, valores.z);
    this.gravidade = 0.9 * this.gravidade + 0.1 * magnitude;
    const impulso = magnitude - this.gravidade;
    const agora = performance.now();
    if (impulso > 1.2 && !this.pico && agora - this.ultimoPasso > 300) {
      this.passos.update((n) => n + 1);
      this.ultimoPasso = agora;
      this.pico = true;
    }
    if (impulso < 0.3) this.pico = false;
  }

  private async permitirMovimento(): Promise<boolean> {
    try {
      if (typeof DeviceMotionEvent === 'undefined') return false;
      const evento = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
      return evento.requestPermission ? (await evento.requestPermission()) === 'granted' : true;
    } catch {
      return false;
    }
  }
}
