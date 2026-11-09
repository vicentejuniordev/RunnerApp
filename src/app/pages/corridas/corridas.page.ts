import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonModal, ModalController } from '@ionic/angular';

import { CabecalhoComponent } from '../../components/cabecalho/cabecalho.component';
import { CartaoCorridaComponent } from '../../components/cartao-corrida/cartao-corrida.component';
import { MapaRotaComponent } from '../../components/mapa-rota/mapa-rota.component';
import { MetricasCorridaComponent } from '../../components/metricas-corrida/metricas-corrida.component';
import { NavegacaoComponent } from '../../components/navegacao/navegacao.component';
import type { Corrida } from '../../models/corrida';
import { CorridasService } from '../../services/corridas.service';
import { RotasService } from '../../services/rotas.service';

@Component({
  selector: 'app-corridas',
  templateUrl: 'corridas.page.html',
  styleUrls: ['corridas.page.scss'],
  imports: [
    DatePipe,
    IonContent,
    IonModal,
    CabecalhoComponent,
    CartaoCorridaComponent,
    MapaRotaComponent,
    MetricasCorridaComponent,
    NavegacaoComponent,
  ],
})
export class CorridasPage {
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  readonly historico = inject(CorridasService);
  private readonly rotas = inject(RotasService);
  readonly rotasDisponiveis = computed(() => this.rotas.rotas().filter((rota) => !!rota.percurso));
  readonly escolhendo = signal(false);
  readonly selecionada = signal<Corrida | null>(null);

  async escolherRota(id: string | null): Promise<void> {
    await this.modalController.dismiss();
    this.escolhendo.set(false);
    await this.router.navigate(id ? ['/corrida', id] : ['/rotas']);
  }
}
