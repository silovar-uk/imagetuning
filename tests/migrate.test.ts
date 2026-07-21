import { describe, expect, it } from 'vitest';
import { migrateDocument } from '../src/document/migrate';

describe('migrateDocument', () => {
  it('AI関連フィールドを無視してv2へ変換する', () => {
    const document = migrateDocument({
      schemaVersion: 1,
      aiAnalysis: { prompt: 'remove me' },
      canvas: { width: 800, height: 600 },
      images: [{
        id: 'img_old',
        name: 'old.png',
        dataUrl: 'data:image/png;base64,AA==',
        width: 320,
        height: 240,
      }],
      comments: [{ objectId: 'img_old', comment: '修正コメント' }],
    });

    expect(document.schemaVersion).toBe(2);
    expect(document.images[0]?.src).toContain('data:image/png');
    expect(document.comments[0]?.text).toBe('修正コメント');
    expect('aiAnalysis' in document).toBe(false);
  });

  it('不正な入力を拒否する', () => {
    expect(() => migrateDocument(null)).toThrow();
  });
});
