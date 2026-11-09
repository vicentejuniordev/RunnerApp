import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

import { CabecalhoComponent } from '../../components/cabecalho/cabecalho.component';
import { CartaoCorridaComponent } from '../../components/cartao-corrida/cartao-corrida.component';
import { CartaoRotaComponent } from '../../components/cartao-rota/cartao-rota.component';
import { NavegacaoComponent } from '../../components/navegacao/navegacao.component';
import { CorridasService } from '../../services/corridas.service';
import { RotasService } from '../../services/rotas.service';

@Component({
  selector: 'app-inicial',
  templateUrl: 'inicial.page.html',
  styleUrls: ['inicial.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    RouterLink,
    CabecalhoComponent,
    NavegacaoComponent,
    CartaoRotaComponent,
    CartaoCorridaComponent,
  ],
})
export class InicialPage {
  private readonly toastController = inject(ToastController);
  readonly usuario = { nome: 'Vicente Junior' };
  readonly status = { velocidade: '5min /Km', distancia: '20 km', clima: '30°' };
  readonly rotasService = inject(RotasService);
  readonly historico = inject(CorridasService);

  constructor() {
    addIcons({ notificationsOutline });
  }

  async mostrarAviso(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2200, position: 'bottom' });
    await toast.present();
  }
}
