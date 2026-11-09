import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonModal, ToastController } from '@ionic/angular';

import { CabecalhoComponent } from '../../components/cabecalho/cabecalho.component';
import { CartaoRotaComponent } from '../../components/cartao-rota/cartao-rota.component';
import { MapaRotaComponent } from '../../components/mapa-rota/mapa-rota.component';
import { NavegacaoComponent } from '../../components/navegacao/navegacao.component';
import { PontosRotaComponent } from '../../components/pontos-rota/pontos-rota.component';
import type { Percurso } from '../../models/percurso';
import { RotasService } from '../../services/rotas.service';

@Component({
  selector: 'app-rotas',
  templateUrl: 'rotas.page.html',
  styleUrls: ['rotas.page.scss'],
  imports: [
    FormsModule,
    IonContent,
    IonModal,
    CabecalhoComponent,
    NavegacaoComponent,
    CartaoRotaComponent,
    MapaRotaComponent,
    PontosRotaComponent,
  ],
})
export class RotasPage {
  readonly rotasService = inject(RotasService);
  private readonly toastController = inject(ToastController);
  readonly aberto = signal(false);
  readonly processandoFoto = signal(false);
  readonly foto = signal<string | null>(null);
  readonly percurso = signal<Percurso | null>(null);
  readonly erro = signal('');
  nome = '';
  private selecaoFoto = 0;

  abrirCadastro(): void {
    this.nome = '';
    this.foto.set(null);
    this.percurso.set(null);
    this.erro.set('');
    this.aberto.set(true);
  }

  fecharCadastro(): void {
    this.selecaoFoto++;
    this.processandoFoto.set(false);
    this.aberto.set(false);
  }

  usarFundoPadrao(): void {
    this.selecaoFoto++;
    this.foto.set(null);
    this.processandoFoto.set(false);
    this.erro.set('');
  }

  async selecionarFoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;
    const selecao = ++this.selecaoFoto;
    this.erro.set('');
    if (!arquivo.type.startsWith('image/') || arquivo.size > 10 * 1024 * 1024) {
      this.erro.set('Escolha uma imagem de até 10 MB.');
      return;
    }
    this.processandoFoto.set(true);
    try {
      const foto = await this.prepararFoto(arquivo);
      if (selecao === this.selecaoFoto) this.foto.set(foto);
    } catch {
      if (selecao === this.selecaoFoto)
        this.erro.set('Não foi possível abrir a foto. Tente uma imagem JPEG, PNG ou WebP.');
    } finally {
      if (selecao === this.selecaoFoto) this.processandoFoto.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.processandoFoto()) return;
    const percurso = this.percurso();
    if (!percurso) {
      this.erro.set('Confirme o início e a chegada e gere o mapa da rota antes de salvar.');
      return;
    }
    if (!this.nome.trim() || this.nome.trim().length > 60) {
      this.erro.set('Informe um nome de até 60 caracteres.');
      return;
    }
    try {
      this.rotasService.adicionar(this.nome, this.foto(), percurso);
    } catch {
      this.erro.set('Não foi possível salvar no aparelho. Tente usar o mapa da rota para ocupar menos espaço.');
      return;
    }
    this.fecharCadastro();
    const toast = await this.toastController.create({ message: 'Rota cadastrada!', duration: 2200 });
    await toast.present();
  }

  private prepararFoto(arquivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const imagem = new Image();
      imagem.onload = () => {
        try {
          const escala = Math.min(1, 960 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
          canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
          const contexto = canvas.getContext('2d');
          if (!contexto) throw new Error('Canvas indisponível.');
          contexto.fillStyle = '#fff';
          contexto.fillRect(0, 0, canvas.width, canvas.height);
          contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      imagem.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Imagem inválida.'));
      };
      imagem.src = url;
    });
  }
}
