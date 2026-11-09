import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonGrid, IonRow, IonCol, IonImg, IonText, IonButton} from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [  IonContent, IonGrid, IonRow, IonCol, IonImg, IonText, IonButton,RouterLink],
})
export class HomePage {
  constructor() {}
}
