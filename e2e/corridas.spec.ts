import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type AparelhoTeste = {
  mover: (longitude: number, latitude: number, segundos?: number) => void;
  watches: number;
  encerrados: number;
  cameras: MediaStream[];
  restaurarStorage?: () => void;
};

test.use({ timezoneId: 'America/Fortaleza', permissions: ['camera'] });

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ path: 'src/assets/images/logo-runner.png', contentType: 'image/png' }),
  );
  await page.addInitScript(() => {
    const percurso = {
      inicio: { nome: 'Início', latitude: -3.7259, longitude: -38.5115 },
      chegada: { nome: 'Chegada', latitude: -3.728, longitude: -38.508 },
      distanciaMetros: 728,
      coordenadas: [
        [-38.5115, -3.7259],
        [-38.51, -3.726],
        [-38.508, -3.728],
      ],
    };
    if (!localStorage.getItem('runnerapp.rotas.v1'))
      localStorage.setItem(
        'runnerapp.rotas.v1',
        JSON.stringify([{ id: 'teste', nome: 'Rota do parque', foto: null, percurso }]),
      );
    if (!localStorage.getItem('runnerapp.corridas.v1')) localStorage.setItem('runnerapp.corridas.v1', '[]');
    const appWindow = window as typeof window & { aparelho: AparelhoTeste };
    let callback: PositionCallback | null = null;
    let timestamp = Date.now();
    const posicao = (longitude: number, latitude: number): GeolocationPosition =>
      ({
        timestamp,
        coords: {
          longitude,
          latitude,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
      }) as GeolocationPosition;
    appWindow.aparelho = {
      mover: (longitude, latitude, segundos = 10) => {
        timestamp += segundos * 1000;
        callback?.(posicao(longitude, latitude));
      },
      watches: 0,
      encerrados: 0,
      cameras: [],
    };
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (sucesso: PositionCallback) => sucesso(posicao(-38.5115, -3.7259)),
        watchPosition: (sucesso: PositionCallback) => {
          callback = sucesso;
          appWindow.aparelho.watches++;
          return 1;
        },
        clearWatch: () => {
          callback = null;
          appWindow.aparelho.encerrados++;
        },
      },
    });
    const abrirCamera = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (opcoes) => {
      const stream = await abrirCamera(opcoes);
      appWindow.aparelho.cameras.push(stream);
      return stream;
    };
  });
});

async function iniciar(page: Page): Promise<void> {
  await page.goto('/corrida/teste');
  await page.getByRole('button', { name: 'Iniciar rota', exact: true }).click();
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Corrida em andamento' })).toBeVisible();
  await page.waitForFunction(() => (window as typeof window & { aparelho: AparelhoTeste }).aparelho.watches === 1);
}

test('acompanha o GPS, finaliza, encerra sensores e mantém a corrida no histórico', async ({ page }) => {
  await iniciar(page);
  await page.evaluate(() => (window as typeof window & { aparelho: AparelhoTeste }).aparelho.mover(-38.5111, -3.7259));
  await expect(page.locator('app-metricas-corrida')).toContainText('0.04 km');
  await page.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Corrida salva!' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as typeof window & { aparelho: AparelhoTeste }).aparelho.encerrados))
    .toBe(1);
  await page.getByRole('link', { name: 'Ver corridas realizadas' }).click();
  await expect(page.getByRole('heading', { name: 'Corridas', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Ver corrida Rota do parque' }).click();
  await expect(page.locator('app-metricas-corrida')).toContainText('0.04 km');
});

test('à noite pergunta sobre o flash e registra foto com métricas', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T22:00:00-03:00') });
  await iniciar(page);
  await page.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
  await page.getByRole('button', { name: 'Tirar foto da corrida' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Ativar flash?');
  await page.getByRole('button', { name: 'Ligar flash', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capturar foto' })).toBeEnabled();
  await expect(page.locator('app-camera-corrida')).toContainText('Flash indisponível neste navegador');
  await page.getByRole('button', { name: 'Capturar foto' }).click();
  await expect(page.getByAltText('Foto da corrida com suas métricas')).toBeVisible();
  await expect(page.getByAltText('Foto da corrida com suas métricas')).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { aparelho: AparelhoTeste }).aparelho.cameras.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    )
    .toBe(true);
  await page.getByRole('link', { name: 'Ver corridas realizadas' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Ver corrida Rota do parque' }).click();
  await expect(page.getByAltText('Registro fotográfico da corrida com métricas')).toBeVisible();
});

test('de dia abre a câmera sem perguntar pelo flash e cancelar preserva a corrida', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T10:00:00-03:00') });
  await iniciar(page);
  await page.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
  await page.getByRole('button', { name: 'Tirar foto da corrida' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Capturar foto' })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('app-camera-corrida')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Corrida salva!' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as typeof window & { aparelho: AparelhoTeste }).aparelho.cameras.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    )
    .toBe(true);
});

test('não inicia a corrida quando o GPS é negado', async ({ page }) => {
  await page.goto('/corrida/teste');
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_sucesso, falha) =>
      falha?.({ code: 1, message: 'Permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
  });
  await page.getByRole('button', { name: 'Iniciar rota', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Autorize a localização');
  await expect(page.getByRole('button', { name: 'Finalizar rota', exact: true })).toHaveCount(0);
});

test('mantém as métricas para tentar salvar novamente se o armazenamento falhar', async ({ page }) => {
  await iniciar(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { aparelho: AparelhoTeste }).aparelho.restaurarStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Sem espaço', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('não foi possível salvar');
  await expect(page.getByRole('button', { name: 'Tirar foto da corrida' })).toHaveCount(0);
  await page.evaluate(() => (window as typeof window & { aparelho: AparelhoTeste }).aparelho.restaurarStorage?.());
  await page.getByRole('button', { name: 'Tentar salvar corrida' }).click();
  await expect(page.getByRole('heading', { name: 'Corrida salva!' })).toBeVisible();
});

test('permite escolher uma rota pelo histórico e cancelar a saída durante a corrida', async ({ page }) => {
  await page.goto('/corridas');
  await page.getByRole('button', { name: 'Adicionar Corrida', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar rota Rota do parque', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rota do parque', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar rota', exact: true }).click();
  await expect(page.getByText('Corrida em andamento', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: '← Corridas', exact: true }).click();
  await expect(page).toHaveURL(/\/corrida\/teste$/);
  await page.getByRole('button', { name: 'Finalizar rota', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Corrida salva!' })).toBeVisible();
});
