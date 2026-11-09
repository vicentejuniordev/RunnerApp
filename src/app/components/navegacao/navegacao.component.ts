import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonFooter, IonIcon, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, trailSignOutline, footstepsOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-navegacao',
  imports: [IonFooter, IonIcon, RouterLink],
  template: `
    <ion-footer class="ion-no-border">
      <nav aria-label="Navegação principal">
        <a
          routerLink="/inicial"
          aria-label="Início"
          [class.ativo]="pagina() === 'inicial'"
          [attr.aria-current]="pagina() === 'inicial' ? 'page' : null"
          ><ion-icon name="home-outline" aria-hidden="true"></ion-icon
        ></a>
        <a
          routerLink="/rotas"
          aria-label="Minhas rotas"
          [class.ativo]="pagina() === 'rotas'"
          [attr.aria-current]="pagina() === 'rotas' ? 'page' : null"
          ><ion-icon name="trail-sign-outline" aria-hidden="true"></ion-icon
        ></a>
        <a
          routerLink="/corridas"
          aria-label="Corridas"
          [class.ativo]="pagina() === 'corridas'"
          [attr.aria-current]="pagina() === 'corridas' ? 'page' : null"
        >
          <ion-icon name="footsteps-outline" aria-hidden="true"></ion-icon>
        </a>
        <button type="button" aria-label="Perfil" (click)="avisar('perfil')">
          <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
        </button>
      </nav>
    </ion-footer>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }
    ion-footer {
      background: #f7f7f7;
    }
    nav {
      display: flex;
      justify-content: space-around;
      align-items: center;
      min-height: 56px;
      padding: 4px 12px max(4px, env(safe-area-inset-bottom));
      border: 1px solid #bfc1c7;
      border-bottom: 0;
      border-radius: 15px 15px 0 0;
      color: #777;
    }
    a,
    button {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      text-decoration: none;
    }
    ion-icon {
      font-size: 30px;
    }
    .ativo {
      color: #5785f7;
    }
    a:focus-visible,
    button:focus-visible {
      outline: 2px solid #5785f7;
    }
  `,
})
export class NavegacaoComponent {
  readonly pagina = input.required<'inicial' | 'rotas' | 'corridas'>();
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({ homeOutline, trailSignOutline, footstepsOutline, personCircleOutline });
  }

  async avisar(tela: string): Promise<void> {
    const toast = await this.toastController.create({
      message: `A tela de ${tela} será implementada em breve.`,
      duration: 2200,
    });
    await toast.present();
  }
}
