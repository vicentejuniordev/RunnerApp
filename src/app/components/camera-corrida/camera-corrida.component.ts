import type { ElementRef } from '@angular/core';
import { afterNextRender, Component, DestroyRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CameraPreview } from '@capacitor-community/camera-preview';

import { formatarTempo } from '../../models/corrida';
import type { Corrida } from '../../models/corrida';

@Component({
  selector: 'app-camera-corrida',
  template: `
    <header>
      <h2>Registrar corrida</h2>
      <button type="button" (click)="cancelar.emit()" [disabled]="capturando()">Cancelar</button>
    </header>
    <div #area class="camera"><video #video autoplay muted playsinline aria-label="Prévia da câmera"></video></div>
    <div class="controles">
      <p role="status">{{ status() }}</p>
      @if (erro()) {
        <p role="alert">{{ erro() }}</p>
      }
      <button type="button" (click)="capturar()" [disabled]="!pronta() || capturando()">
        {{ capturando() ? 'Preparando foto…' : 'Capturar foto' }}
      </button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      background: #fff;
      color: #080808;
      padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      min-height: 70px;
    }
    h2 {
      font-size: 18px;
      margin: 0;
    }
    .camera {
      flex: 1;
      min-height: 160px;
      overflow: hidden;
      background: #111;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .controles {
      padding: 12px 0 20px;
    }
    p {
      font-size: 13px;
    }
    [role='alert'] {
      color: #b42318;
    }
    button {
      padding: 12px 16px;
      border-radius: 8px;
      color: #fff;
      background: #5785f7;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
    }
    button:focus-visible {
      outline: 2px solid #244ba5;
      outline-offset: 2px;
    }
  `,
})
export class CameraCorridaComponent {
  readonly corrida = input.required<Corrida>();
  readonly flashSolicitado = input(false);
  readonly foto = output<string>();
  readonly cancelar = output<void>();
  readonly pronta = signal(false);
  readonly capturando = signal(false);
  readonly erro = signal('');
  readonly status = signal('Abrindo câmera…');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly area = viewChild.required<ElementRef<HTMLDivElement>>('area');
  private stream: MediaStream | null = null;
  private destruida = false;
  private nativaIniciada = false;

  constructor() {
    afterNextRender(() => void this.iniciar());
    inject(DestroyRef).onDestroy(() => {
      this.destruida = true;
      void this.parar();
    });
  }

  private async iniciar(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const area = this.area().nativeElement.getBoundingClientRect();
        await CameraPreview.start({
          position: 'rear',
          x: Math.round(area.x),
          y: Math.round(area.y),
          width: Math.round(area.width),
          height: Math.round(area.height),
          toBack: false,
          disableAudio: true,
          storeToFile: false,
        });
        this.nativaIniciada = true;
        if (this.destruida) {
          await this.parar();
          return;
        }
        if (this.flashSolicitado()) {
          try {
            const modos = (await CameraPreview.getSupportedFlashModes()).result;
            const modo = modos.includes('on') ? 'on' : modos.includes('torch') ? 'torch' : null;
            if (!modo) throw new Error('Sem flash.');
            await CameraPreview.setFlashMode({ flashMode: modo });
            this.status.set('Flash ativado para a foto.');
          } catch {
            this.status.set('Flash indisponível nesta câmera. Você pode fotografar sem flash.');
          }
        } else {
          try {
            await CameraPreview.setFlashMode({ flashMode: 'off' });
          } catch {
            /* Some cameras do not expose flash modes. */
          }
          this.status.set('Foto sem flash.');
        }
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera indisponível.');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
        });
        if (this.destruida) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.stream = stream;
        const video = this.video().nativeElement;
        video.srcObject = stream;
        await video.play();
        this.status.set('Foto sem flash.');
        if (this.flashSolicitado()) {
          const track = stream.getVideoTracks()[0];
          const capacidade = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          if (capacidade?.torch) {
            try {
              await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
              this.status.set('Flash ativado para a foto.');
            } catch {
              this.status.set('Não foi possível ativar o flash. Você pode fotografar sem flash.');
            }
          } else this.status.set('Flash indisponível neste navegador. Você pode fotografar sem flash.');
        }
      }
      if (!this.destruida) this.pronta.set(true);
    } catch {
      if (!this.destruida) {
        this.status.set('');
        this.erro.set('Não foi possível abrir a câmera. Autorize o acesso ou cancele para manter a corrida sem foto.');
      }
      await this.parar();
    }
  }

  async capturar(): Promise<void> {
    if (!this.pronta() || this.capturando()) return;
    this.capturando.set(true);
    this.erro.set('');
    try {
      let origem: HTMLVideoElement | HTMLImageElement = this.video().nativeElement;
      if (Capacitor.isNativePlatform()) {
        const captura = await CameraPreview.capture({ quality: 80, width: 1280, height: 960 });
        origem = await new Promise<HTMLImageElement>((resolve, reject) => {
          const imagem = new Image();
          imagem.onload = () => resolve(imagem);
          imagem.onerror = reject;
          imagem.src = `data:image/jpeg;base64,${captura.value}`;
        });
      }
      const largura = origem instanceof HTMLVideoElement ? origem.videoWidth : origem.naturalWidth;
      const altura = origem instanceof HTMLVideoElement ? origem.videoHeight : origem.naturalHeight;
      if (!largura || !altura) throw new Error('Câmera ainda não está pronta.');
      const canvas = document.createElement('canvas');
      const escala = Math.min(1, 960 / Math.max(largura, altura));
      canvas.width = Math.round(largura * escala);
      canvas.height = Math.round(altura * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');
      ctx.drawImage(origem, 0, 0, canvas.width, canvas.height);
      const corrida = this.corrida();
      const escalaTexto = Math.max(0.5, canvas.width / 640);
      const faixa = Math.min(canvas.height, 100 * escalaTexto);
      ctx.fillStyle = 'rgba(0, 0, 0, .7)';
      ctx.fillRect(0, canvas.height - faixa, canvas.width, faixa);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${18 * escalaTexto}px Arial`;
      ctx.fillText(
        `RunnerApp · ${corrida.nome}`,
        12 * escalaTexto,
        canvas.height - faixa + 28 * escalaTexto,
        canvas.width - 24 * escalaTexto,
      );
      ctx.font = `${14 * escalaTexto}px Arial`;
      ctx.fillText(
        `${(corrida.distanciaMetros / 1000).toFixed(2)} km · ${formatarTempo(corrida.duracaoSegundos)} · ${corrida.calorias} kcal (est.)`,
        12 * escalaTexto,
        canvas.height - faixa + 54 * escalaTexto,
      );
      ctx.fillText(
        new Date(corrida.fim).toLocaleString('pt-BR'),
        12 * escalaTexto,
        canvas.height - faixa + 78 * escalaTexto,
      );
      const foto = canvas.toDataURL('image/jpeg', 0.8);
      await this.parar();
      if (!this.destruida) this.foto.emit(foto);
    } catch {
      if (!this.destruida) this.erro.set('Não foi possível capturar a foto. Tente novamente.');
    } finally {
      if (!this.destruida) this.capturando.set(false);
    }
  }

  private async parar(): Promise<void> {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.nativaIniciada) {
      this.nativaIniciada = false;
      try {
        await CameraPreview.setFlashMode({ flashMode: 'off' });
      } catch {
        /* Flash may be unavailable. */
      }
      try {
        await CameraPreview.stop();
      } catch {
        /* The operating system may already have stopped it. */
      }
    }
  }
}
