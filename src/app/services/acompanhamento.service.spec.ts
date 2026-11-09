import { Geolocation } from '@capacitor/geolocation';
import type { Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import type { AccelListener } from '@capacitor/motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AcompanhamentoService } from './acompanhamento.service';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: { getCurrentPosition: vi.fn(), watchPosition: vi.fn(), clearWatch: vi.fn() },
}));
vi.mock('@capacitor/motion', () => ({ Motion: { addListener: vi.fn() } }));

const posicao = (latitude: number, timestamp: number, accuracy = 5): Position => ({
  timestamp,
  coords: {
    latitude,
    longitude: -38.5,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    magneticHeading: null,
    trueHeading: null,
    headingAccuracy: null,
    course: null,
  },
});

describe('AcompanhamentoService', () => {
  let servico: AcompanhamentoService;
  let gps: WatchPositionCallback;
  let movimento: AccelListener;
  const remover = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    vi.clearAllMocks();
    vi.stubGlobal('DeviceMotionEvent', class {});
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(posicao(-3.7, Date.now()));
    vi.mocked(Geolocation.watchPosition).mockImplementation(async (_opcoes, callback) => {
      gps = callback;
      return 'gps-teste';
    });
    vi.mocked(Geolocation.clearWatch).mockResolvedValue();
    vi.mocked(Motion.addListener).mockImplementation(async (_tipo, callback) => {
      movimento = callback as unknown as AccelListener;
      return { remove: remover };
    });
    remover.mockResolvedValue(undefined);
    servico = new AcompanhamentoService();
  });

  afterEach(async () => {
    await servico.limpar();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('mede o percurso real, ignora oscilações e para o relógio ao finalizar', async () => {
    await servico.iniciar(70);
    await vi.advanceTimersByTimeAsync(10000);
    gps(posicao(-3.6996, Date.now()));
    expect(servico.distancia()).toBeCloseTo(44.48, 1);
    gps(posicao(-3.69959, Date.now() + 1000));
    gps(posicao(-3, Date.now() + 2000));
    expect(servico.distancia()).toBeCloseTo(44.48, 1);
    expect(servico.calorias()).toBe(3);
    const corrida = servico.finalizar({ id: 'rota', nome: 'Rota', foto: null });
    await vi.advanceTimersByTimeAsync(5000);
    expect(corrida.duracaoSegundos).toBe(10);
    expect(servico.duracao()).toBe(10);
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'gps-teste' });
    expect(remover).toHaveBeenCalledOnce();
  });

  it('conta um passo por pico com intervalo mínimo e para de contar após finalizar', async () => {
    await servico.iniciar(70);
    const pulso = (z: number) =>
      movimento({
        acceleration: { x: 0, y: 0, z: 0 },
        accelerationIncludingGravity: { x: 0, y: 0, z },
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
        interval: 20,
      });
    pulso(13);
    pulso(13);
    pulso(9.81);
    expect(servico.passos()).toBe(1);
    await vi.advanceTimersByTimeAsync(400);
    pulso(13);
    expect(servico.passos()).toBe(2);
    servico.finalizar({ id: 'rota', nome: 'Rota', foto: null });
    await vi.advanceTimersByTimeAsync(400);
    pulso(9.81);
    pulso(13);
    expect(servico.passos()).toBe(2);
  });

  it('não inicia com um GPS impreciso', async () => {
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(posicao(-3.7, Date.now(), 200));
    await expect(servico.iniciar(70)).rejects.toThrow('impreciso');
    expect(servico.estado()).toBe('pronto');
    expect(Geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it('descarta uma resposta de GPS que chegou depois de sair da página', async () => {
    let resolver!: (pos: Position) => void;
    vi.mocked(Geolocation.getCurrentPosition).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    const iniciando = servico.iniciar(70);
    await servico.limpar();
    resolver(posicao(-3.7, Date.now()));
    await iniciando;
    expect(servico.estado()).toBe('pronto');
    expect(Geolocation.watchPosition).not.toHaveBeenCalled();
  });
});
