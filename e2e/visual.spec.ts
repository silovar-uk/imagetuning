import { expect, test } from '@playwright/test';

function svgDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320">
      <rect width="520" height="320" fill="#f5f3ed"/>
      <rect x="38" y="42" width="444" height="236" rx="18" fill="#ffffff" stroke="#d6d1c7" stroke-width="4"/>
      <circle cx="132" cy="118" r="42" fill="#c42026"/>
      <path d="M76 242 190 144l68 63 78-90 108 125Z" fill="#273d35"/>
      <text x="260" y="88" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#202622">Image Review</text>
    </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

test('標準レビュー画面の見た目を維持する', async ({ page }) => {
  const document = {
    schemaVersion: 2,
    canvas: { width: 760, height: 480, background: 'white', numberingMode: 'position' },
    images: [{
      id: 'visual-image',
      name: 'campaign-visual.svg',
      src: svgDataUrl(),
      mimeType: 'image/svg+xml',
      x: 80,
      y: 70,
      width: 520,
      height: 320,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 0,
    }],
    shapes: [{
      id: 'visual-arrow',
      type: 'arrow',
      x: 420,
      y: 130,
      width: 150,
      height: 70,
      color: '#C42026',
      fillColor: 'transparent',
      lineWidth: 5,
      lineStyle: 'solid',
      zIndex: 1,
      visible: true,
      locked: false,
    }],
    comments: [
      {
        id: 'comment-image',
        targetType: 'image',
        targetId: 'visual-image',
        text: 'タイトル周辺の余白をもう少し広げる',
        createdAt: '2026-07-22T00:00:00.000Z',
      },
      {
        id: 'comment-arrow',
        targetType: 'shape',
        targetId: 'visual-arrow',
        text: 'この要素を右上へ移動する',
        createdAt: '2026-07-22T00:01:00.000Z',
      },
    ],
  };

  await page.goto('/imagetuning/');
  await page.locator('input[type="file"][accept*="application/json"]').setInputFiles({
    name: 'visual-review.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(page.getByText('タイトル周辺の余白をもう少し広げる', { exact: true })).toBeVisible();
  await expect(page.locator('.toast')).toBeHidden({ timeout: 5000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await expect(page).toHaveScreenshot('editor-review.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
  });
});
