import type { AppDocument } from './types';

export function serializeDocument(document: AppDocument): string {
  return JSON.stringify(document, null, 2);
}
