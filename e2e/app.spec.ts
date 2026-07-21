import { expect, test } from '@playwright/test';

const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=';

test('画像を読み込み、編集画面へ表示できる', async ({ page }) => {
  await page.goto('/imagetuning/');

  await expect(page.getByRole('heading', { name: 'Image Tuning' })).toBeVisible();
  await expect(page.locator('.empty-state')).toBeVisible();

  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await fileInput.setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(onePixelPng, 'base64'),
  });

  await expect(page.locator('.empty-state')).toBeHidden();
  await expect(page.getByText('sample.png', { exact: true })).toBeVisible();
  await expect(page.locator('canvas.editor-canvas')).toBeVisible();
});
