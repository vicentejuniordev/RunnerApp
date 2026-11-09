import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonGrid, IonRow, IonCol, IonImg, IonText, IonButton} from '@ionic/angular';

@Component({
  selector: 'app-inicial',
  templateUrl: 'inicial.page.html',
  styleUrls: ['inicial.page.scss'],
  imports: [  IonContent, IonGrid, IonRow, IonCol, IonImg, IonText, IonButton, RouterLink],
})
export class InicialPage {
  constructor() {}
}
