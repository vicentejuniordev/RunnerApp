import { Component, computed, HostListener, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertController, IonContent } from '@ionic/angular';

import { CabecalhoComponent } from '../../components/cabecalho/cabecalho.component';
import { CameraCorridaComponent } from '../../components/camera-corrida/camera-corrida.component';
import { MapaRotaComponent } from '../../components/mapa-rota/mapa-rota.component';
import { MetricasCorridaComponent } from '../../components/metricas-corrida/metricas-corrida.component';
import type { Corrida } from '../../models/corrida';
import { AcompanhamentoService } from '../../services/acompanhamento.service';
import { CorridasService } from '../../services/corridas.service';
import { RotasService } from '../../services/rotas.service';

@Component({
  selector: 'app-corrida',
  templateUrl: 'corrida.page.html',
  styleUrls: ['corrida.page.scss'],
  providers: [AcompanhamentoService],
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    CabecalhoComponent,
    MapaRotaComponent,
    MetricasCorridaComponent,
    CameraCorridaComponent,
  ],
})
export class CorridaPage {
  readonly rotaId = input.required<string>();
  readonly acompanhamento = inject(AcompanhamentoService);
  private readonly rotas = inject(RotasService);
  private readonly corridas = inject(CorridasService);
  private readonly alertController = inject(AlertController);
  readonly rota = computed(() => this.rotas.rotas().find((rota) => rota.id === this.rotaId()));
  readonly registro = signal<Corrida | null>(null);
  readonly salva = signal(false);
  readonly cameraAberta = signal(false);
  readonly flash = signal(false);
  readonly erro = signal('');
  readonly fotoPendente = signal<string | null>(null);
  readonly perguntandoFoto = signal(false);
  peso = 70;

  ionViewWillEnter(): void {
    void this.acompanhamento.limpar();
    this.registro.set(null);
    this.salva.set(false);
    this.erro.set('');
    this.fotoPendente.set(null);
  }

  ionViewWillLeave(): void {
    this.cameraAberta.set(false);
    void this.acompanhamento.limpar();
  }

  async iniciar(): Promise<void> {
    this.erro.set('');
    try {
      await this.acompanhamento.iniciar(Number(this.peso));
    } catch (error) {
      this.erro.set(error instanceof Error ? error.message : 'Não foi possível iniciar a corrida.');
    }
  }

  finalizar(): void {
    const rota = this.rota();
    if (!rota || this.acompanhamento.estado() !== 'correndo') return;
    this.registro.set(this.acompanhamento.finalizar(rota));
    this.salvarRegistro();
  }

  salvarRegistro(): void {
    const registro = this.registro();
    if (!registro) return;
    try {
      this.corridas.salvar(registro);
      this.salva.set(true);
      this.erro.set('');
    } catch {
      this.erro.set(
        'A corrida terminou, mas não foi possível salvar no aparelho. Libere espaço e tente novamente antes de sair.',
      );
    }
  }

  async abrirCamera(): Promise<void> {
    if (!this.salva() || this.perguntandoFoto() || this.cameraAberta()) return;
    this.perguntandoFoto.set(true);
    try {
      const hora = new Date().getHours();
      let usarFlash = false;
      if (hora >= 18 || hora < 6) {
        const alerta = await this.alertController.create({
          header: 'Ativar flash?',
          message: 'Pelo horário do aparelho, parece ser noite. Deseja ligar o flash para a foto?',
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Sem flash', role: 'sem-flash' },
            { text: 'Ligar flash', role: 'com-flash' },
          ],
          backdropDismiss: false,
        });
        await alerta.present();
        const { role } = await alerta.onDidDismiss();
        if (role !== 'sem-flash' && role !== 'com-flash') return;
        usarFlash = role === 'com-flash';
      }
      this.flash.set(usarFlash);
      this.cameraAberta.set(true);
    } finally {
      this.perguntandoFoto.set(false);
    }
  }

  receberFoto(foto: string): void {
    this.cameraAberta.set(false);
    this.fotoPendente.set(foto);
    this.salvarFoto();
  }

  salvarFoto(): void {
    const registro = this.registro(),
      foto = this.fotoPendente();
    if (!registro || !foto) return;
    try {
      const atualizado = { ...registro, foto };
      this.corridas.salvar(atualizado);
      this.registro.set(atualizado);
      this.fotoPendente.set(null);
      this.erro.set('');
    } catch {
      this.erro.set(
        'A corrida está salva sem a foto. Não há espaço para guardar a imagem. Tente novamente ou continue sem ela.',
      );
    }
  }

  podeSair(): boolean {
    if (this.cameraAberta() || this.perguntandoFoto()) return false;
    const pendente =
      this.acompanhamento.estado() === 'correndo' ||
      this.acompanhamento.estado() === 'iniciando' ||
      (!!this.registro() && !this.salva());
    return (
      !pendente || window.confirm('Há uma corrida em andamento ou ainda não salva. Sair e descartar esse registro?')
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  antesDeSair(event: BeforeUnloadEvent): void {
    if (this.acompanhamento.estado() === 'correndo' || (!!this.registro() && !this.salva())) event.preventDefault();
  }
}
