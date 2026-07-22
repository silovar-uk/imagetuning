import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=';

async function uploadSampleImage(page: Page) {
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await fileInput.setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(onePixelPng, 'base64'),
  });
  await expect(page.getByText('sample.png', { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/imagetuning/');
  await expect(page.getByRole('heading', { name: 'Image Tuning' })).toBeVisible();
});

test('画像を読み込み、編集画面へ表示できる', async ({ page }) => {
  await expect(page.locator('.empty-state')).toBeVisible();
  await uploadSampleImage(page);
  await expect(page.locator('.empty-state')).toBeHidden();
  await expect(page.locator('canvas.editor-canvas')).toBeVisible();
});

test('選択画像へコメントを追加し、PNGプレビューを確認できる', async ({ page }) => {
  await uploadSampleImage(page);

  const composer = page.getByPlaceholder('修正内容を入力…');
  await composer.fill('赤を少し明るくする');
  await page.getByRole('button', { name: 'コメントを追加' }).click();
  await expect(page.getByText('赤を少し明るくする', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /コメント 1/ })).toBeVisible();

  await page.getByRole('button', { name: 'PNG書出し' }).click();
  const dialog = page.getByRole('dialog', { name: 'PNG書き出しプレビュー' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('コメント').locator('..').getByText('1件')).toBeVisible();
  await expect(dialog.getByAltText('PNG書き出しプレビュー')).toBeVisible();
  await dialog.getByRole('button', { name: '黒' }).click();
  await expect(dialog.getByRole('button', { name: '黒' })).toHaveClass(/is-active/);
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dialog).toBeHidden();
});

test('画像修正モーダルで編集モードと履歴状態を確認できる', async ({ page }) => {
  await uploadSampleImage(page);
  await page.getByRole('button', { name: '画像修正' }).click();

  const modal = page.locator('.retouch-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('消去・単色塗り・ぼかし')).toBeVisible();
  await modal.getByRole('button', { name: '塗る' }).click();
  await expect(modal.locator('input[type="color"]')).toBeVisible();
  await expect(modal.getByText(/履歴 1 \/ 1件/)).toBeVisible();
  await expect(modal.locator('canvas')).toBeVisible();
  await modal.getByRole('button', { name: 'キャンセル' }).click();
  await expect(modal).toBeHidden();
});

test('ペン線の幅変更で点列も比率変換される', async ({ page }) => {
  const document = {
    schemaVersion: 2,
    canvas: { width: 400, height: 300, background: 'white', numberingMode: 'position' },
    images: [],
    shapes: [{
      id: 'pen-1',
      type: 'pen',
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      color: '#C42026',
      lineWidth: 4,
      lineStyle: 'solid',
      points: [{ x: 10, y: 20 }, { x: 60, y: 70 }, { x: 110, y: 120 }],
      zIndex: 0,
      visible: true,
      locked: false,
    }],
    comments: [],
  };

  await page.locator('input[type="file"][accept*="application/json"]').setInputFiles({
    name: 'pen-document.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await page.getByRole('button', { name: /レイヤー 1/ }).click();
  await page.locator('.layer-item').click();

  const widthInput = page.getByLabel('図形の幅');
  await expect(widthInput).toHaveValue('100');
  await widthInput.fill('200');
  await expect(widthInput).toHaveValue('200');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTitle('JSONを書き出す').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, 'utf8'));
  expect(exported.shapes[0].width).toBe(200);
  expect(exported.shapes[0].points).toEqual([
    { x: 10, y: 20 },
    { x: 110, y: 70 },
    { x: 210, y: 120 },
  ]);
});
