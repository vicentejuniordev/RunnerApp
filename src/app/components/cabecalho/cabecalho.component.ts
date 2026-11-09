import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { menuOutline } from 'ionicons/icons';

@Component({
  selector: 'app-cabecalho',
  imports: [IonHeader, IonToolbar, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="cabecalho">
          <div class="marca">
            <img src="assets/images/logo-runner.png" alt="" /><span>Run<span class="destaque">ner</span>App</span>
          </div>
          <button type="button" aria-label="Abrir menu" (click)="abrirMenu()">
            <ion-icon name="menu-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }
    ion-toolbar {
      --background: #fff;
      --color: #080808;
      --min-height: 64px;
    }
    .cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 34px;
      padding: 0 12px;
      border-inline: 5px solid #5785f7;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 600;
    }
    img {
      width: 30px;
      height: 30px;
      object-fit: contain;
    }
    .destaque {
      color: #5785f7;
    }
    button {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    ion-icon {
      font-size: 24px;
    }
    button:focus-visible {
      outline: 2px solid #5785f7;
    }
  `,
})
export class CabecalhoComponent {
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ menuOutline });
  }

  async abrirMenu(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'As próximas telas estarão disponíveis em breve.',
      duration: 2200,
    });
    await toast.present();
  }
}
