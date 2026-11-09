import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const INICIO = '-3.7259, -38.5115';
const CHEGADA = '-3.7280, -38.5080';

async function definirPontos(page: Page): Promise<void> {
  await page.getByLabel('Ponto de início (A)', { exact: true }).fill(INICIO);
  await page.getByRole('button', { name: 'Buscar Ponto de início (A)', exact: true }).click();
  await page.getByRole('button', { name: INICIO, exact: true }).click();
  await page.getByLabel('Ponto de chegada (B)', { exact: true }).fill(CHEGADA);
  await page.getByRole('button', { name: 'Buscar Ponto de chegada (B)', exact: true }).click();
  await page.getByRole('button', { name: CHEGADA, exact: true }).click();
}

async function definirTrajeto(page: Page): Promise<void> {
  await definirPontos(page);
  await page.getByRole('button', { name: 'Gerar mapa da rota', exact: true }).click();
  await expect(page.getByRole('img', { name: /Mapa do trajeto de/ })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // Keep public map services out of automated browser runs.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ path: 'src/assets/images/logo-runner.png', contentType: 'image/png' }),
  );
  await page.route('https://routing.openstreetmap.de/**', (route) =>
    route.fulfill({
      json: {
        code: 'Ok',
        routes: [
          {
            distance: 727.8,
            geometry: {
              coordinates: [
                [-38.5115, -3.7259],
                [-38.5105, -3.7259],
                [-38.5105, -3.728],
                [-38.508, -3.728],
              ],
            },
          },
        ],
      },
    }),
  );
  await page.route('https://photon.komoot.io/**', (route) =>
    route.fulfill({
      json: {
        features: [
          { geometry: { coordinates: [-38.508, -3.728] }, properties: { name: 'Praça de chegada', city: 'Fortaleza' } },
        ],
      },
    }),
  );
  await page.goto('/rotas');
});

test('cadastra uma rota com fundo padrão e mantém os dados na inicial e após recarregar', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Minhas Rotas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeDisabled();
  await page.getByLabel('Nome da rota', { exact: true }).fill('  Rota do parque  ');
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeDisabled();
  await definirTrajeto(page);
  await page.getByRole('button', { name: 'Salvar rota' }).click();
  await expect(page.getByRole('heading', { name: 'Rota do parque', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rota do parque', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Início', exact: true }).click();
  await expect(page.locator('app-rotas')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Rota do parque, ver minhas rotas' })).toBeAttached();
  await page.getByRole('link', { name: 'Minhas rotas', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Não salvar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Não salvar', exact: true })).toHaveCount(0);
});

test('permite escolher uma foto, voltar ao padrão e persistir a foto escolhida', async ({ page }) => {
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Rota com foto');
  await definirTrajeto(page);
  await page
    .getByLabel('Selecionar foto da galeria', { exact: true })
    .setInputFiles('src/assets/images/logo-runner.png');
  await expect(page.getByAltText('Prévia da foto da rota')).toBeVisible();
  await page.getByRole('button', { name: 'Usar mapa da rota' }).click();
  await expect(page.getByAltText('Prévia da foto da rota')).toHaveCount(0);
  await page
    .getByLabel('Selecionar foto da galeria', { exact: true })
    .setInputFiles('src/assets/images/logo-runner.png');
  await expect(page.getByAltText('Prévia da foto da rota')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar rota' }).click();
  await page.reload();
  const foto = page.getByAltText('Foto da Rota com foto', { exact: true });
  await expect(foto).toBeVisible();
  await expect(foto).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
});

test('mantém o formulário aberto quando o armazenamento falha', async ({ page }) => {
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Rota sem espaço');
  await definirTrajeto(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Sem espaço', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Salvar rota' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar');
  await expect(page.getByLabel('Nome da rota', { exact: true })).toHaveValue('Rota sem espaço');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rota sem espaço', exact: true })).toHaveCount(0);
});

test('usa o GPS no início, busca a chegada e salva o mapa com os pontos', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -3.7259, longitude: -38.5115 });
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Rota GPS');
  await page.getByRole('button', { name: 'Usar localização atual no início' }).click();
  await expect(page.getByLabel('Ponto de início (A)', { exact: true })).toHaveValue('Localização atual');
  await page.getByLabel('Ponto de chegada (B)', { exact: true }).fill('Praça de chegada, Fortaleza');
  await page.getByRole('button', { name: 'Buscar Ponto de chegada (B)', exact: true }).click();
  await page.getByRole('button', { name: 'Praça de chegada, Fortaleza', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar mapa da rota', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Trajeto a pé de 0.73 km');
  await page.getByRole('button', { name: 'Salvar rota' }).click();
  await expect(page.getByRole('heading', { name: 'Rota GPS', exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Mapa do trajeto de Localização atual até Praça de chegada, Fortaleza' }),
  ).toBeVisible();
  const dados = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('runnerapp.rotas.v1') ?? '[]') as {
        nome: string;
        percurso: { inicio: { latitude: number }; distanciaMetros: number };
      }[],
  );
  expect(dados.find((rota) => rota.nome === 'Rota GPS')?.percurso).toMatchObject({
    inicio: { latitude: -3.7259 },
    distanciaMetros: 727.8,
  });
});

test('exige gerar um novo mapa após alterar um endereço', async ({ page }) => {
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Rota alterada');
  await definirTrajeto(page);
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeEnabled();
  await page.getByLabel('Ponto de chegada (B)', { exact: true }).fill('Outro destino');
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeDisabled();
  await expect(page.getByRole('img', { name: /Mapa do trajeto de/ })).toHaveCount(0);
});

test('não salva uma rota quando o serviço não encontra um trajeto a pé', async ({ page }) => {
  await page.route('https://routing.openstreetmap.de/**', (route) =>
    route.fulfill({ json: { code: 'NoRoute', routes: [] } }),
  );
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Sem trajeto');
  await definirPontos(page);
  await page.getByRole('button', { name: 'Gerar mapa da rota', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi encontrado um trajeto a pé');
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeDisabled();
});

test('preserva rotas antigas que ainda não têm pontos cadastrados', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      'runnerapp.rotas.v1',
      JSON.stringify([{ id: 'antiga', nome: 'Minha rota antiga', foto: null }]),
    ),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minha rota antiga', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Nova rota');
  await definirTrajeto(page);
  await page.getByRole('button', { name: 'Salvar rota' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minha rota antiga', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nova rota', exact: true })).toBeVisible();
});

test('mostra uma mensagem quando não há conexão com o serviço de rotas', async ({ page }) => {
  await page.route('https://routing.openstreetmap.de/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Adicionar Rota', exact: true }).click();
  await page.getByLabel('Nome da rota', { exact: true }).fill('Rota offline');
  await definirPontos(page);
  await page.getByRole('button', { name: 'Gerar mapa da rota', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Verifique a internet');
  await expect(page.getByRole('button', { name: 'Salvar rota' })).toBeDisabled();
});
