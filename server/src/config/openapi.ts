import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

let cachedDocument: Record<string, unknown> | null = null;

export function loadOpenApiDocument(): Record<string, unknown> {
  if (cachedDocument) {
    return cachedDocument;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const openApiPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    'specs',
    'SPEC-2d193ce6',
    'contracts',
    'openapi.yaml',
  );

  const yamlContent = readFileSync(openApiPath, 'utf8');
  const document = parse(yamlContent) as Record<string, unknown>;
  cachedDocument = document;
  return document;
}

export function resetOpenApiCache() {
  cachedDocument = null;
}
