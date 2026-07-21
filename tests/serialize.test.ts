import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../src/document/types';
import { serializeDocument } from '../src/document/serialize';

it('JSONへschemaVersionを含める', () => {
  const json = serializeDocument(createEmptyDocument());
  expect(JSON.parse(json).schemaVersion).toBe(2);
});
