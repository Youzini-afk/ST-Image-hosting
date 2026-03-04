import { TextSliceRule } from './contracts';

export function uuidv4(): string {
  const random = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${random().slice(0, 8)}-${random().slice(0, 4)}-4${random().slice(0, 3)}-a${random().slice(0, 3)}-${random()}${random().slice(0, 4)}`;
}

export function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function now(): number {
  return Date.now();
}

export function clampMin(value: number, min: number): number {
  return Number.isFinite(value) ? Math.max(value, min) : min;
}

export function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function parseJsonObject(input: string): Record<string, string> {
  if (!input.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(input);
    if (!_.isPlainObject(parsed)) {
      throw new Error('must be a JSON object');
    }

    const pairs = _.toPairs(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)] as const);
    return _.fromPairs(pairs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`headers_json is invalid JSON object: ${message}`);
  }
}

export function removeSlices(text: string, rules: TextSliceRule[]): string {
  if (!text || rules.length === 0) {
    return text;
  }

  let result = text;
  for (const rule of rules) {
    if (!rule.start || !rule.end) {
      continue;
    }

    let cursor = 0;
    let output = '';
    while (cursor < result.length) {
      const startIndex = result.indexOf(rule.start, cursor);
      if (startIndex === -1) {
        output += result.slice(cursor);
        break;
      }

      output += result.slice(cursor, startIndex);
      const endIndex = result.indexOf(rule.end, startIndex + rule.start.length);
      if (endIndex === -1) {
        break;
      }
      cursor = endIndex + rule.end.length;
    }

    result = output;
  }

  return result;
}

export function extractSlices(text: string, rules: TextSliceRule[]): string {
  if (!text || rules.length === 0) {
    return text;
  }

  const blocks: string[] = [];
  for (const rule of rules) {
    if (!rule.start || !rule.end) {
      continue;
    }

    let cursor = 0;
    while (cursor < text.length) {
      const startIndex = text.indexOf(rule.start, cursor);
      if (startIndex === -1) {
        break;
      }
      const endIndex = text.indexOf(rule.end, startIndex + rule.start.length);
      if (endIndex === -1) {
        break;
      }
      blocks.push(text.slice(startIndex + rule.start.length, endIndex));
      cursor = endIndex + rule.end.length;
    }
  }

  if (blocks.length === 0) {
    return '';
  }

  return blocks.join('\n');
}

export function toSafeIdentifier(input: string): string {
  const normalized = input
    .replace(/[^a-zA-Z0-9_$]/g, '_')
    .replace(/^[^a-zA-Z_$]/, '_$&');
  return normalized || 'v';
}

export function quoteSingle(input: string): string {
  return `'${input.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}
