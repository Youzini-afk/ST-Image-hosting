import { EwSettings } from './types';

export type RuntimeWorldbook = {
  chat_id: string;
  worldbook_name: string;
  entries: WorldbookEntry[];
  created: boolean;
};

function getChatId(): string {
  try {
    return String(SillyTavern.getCurrentChatId?.() ?? SillyTavern.chatId ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

export function buildRuntimeWorldbookName(settings: EwSettings, chatId: string): string {
  return `${settings.runtime_worldbook_prefix}${chatId}`;
}

function getMetaEntry(entries: WorldbookEntry[], settings: EwSettings): WorldbookEntry | undefined {
  return entries.find(entry => entry.name === settings.meta_entry_name);
}

function parseMetaContent(content: string): { marker: boolean; chat_id?: string } {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const marker = lines.length > 0;
  const pairs = _.fromPairs(
    lines
      .filter(line => line.includes('='))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
      }),
  );
  const chatId = _.get(pairs, 'chat_id');
  const normalizedChatId =
    typeof chatId === 'string' ? chatId.replace(/^['"]/, '').replace(/['"]$/, '') : undefined;
  return {
    marker,
    chat_id: normalizedChatId,
  };
}

function isMetaValid(entry: WorldbookEntry | undefined, settings: EwSettings, chatId: string): boolean {
  if (!entry) {
    return false;
  }
  if (!entry.content.includes(settings.meta_marker)) {
    return false;
  }

  const parsed = parseMetaContent(entry.content);
  if (!parsed.marker) {
    return false;
  }
  if (parsed.chat_id && parsed.chat_id !== chatId) {
    return false;
  }
  return true;
}

function nextUid(entries: WorldbookEntry[]): number {
  const maxUid = _.max(entries.map(entry => entry.uid));
  return (maxUid ?? 0) + 1;
}

function defaultEntry(uid: number, name: string, content: string, enabled: boolean): WorldbookEntry {
  return {
    uid,
    name,
    enabled,
    strategy: {
      type: 'constant',
      keys: [],
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'at_depth',
      role: 'system',
      depth: 0,
      order: 14720,
    },
    content,
    probability: 100,
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    extra: {},
  };
}

function upsertMetaEntry(entries: WorldbookEntry[], settings: EwSettings, chatId: string): WorldbookEntry[] {
  const cloned = klona(entries);
  const content = `${settings.meta_marker}\nchat_id=${chatId}\nupdated_at=${Date.now()}`;
  const existed = cloned.find(entry => entry.name === settings.meta_entry_name);

  if (existed) {
    existed.enabled = true;
    existed.content = content;
    return cloned;
  }

  cloned.push(defaultEntry(nextUid(cloned), settings.meta_entry_name, content, true));
  return cloned;
}

async function findByNameAndValidate(name: string, settings: EwSettings, chatId: string): Promise<WorldbookEntry[] | null> {
  try {
    const entries = await getWorldbook(name);
    if (isMetaValid(getMetaEntry(entries, settings), settings, chatId)) {
      return entries;
    }
    return null;
  } catch {
    return null;
  }
}

export async function ensureRuntimeWorldbook(settings: EwSettings, createIfMissing = true): Promise<RuntimeWorldbook> {
  const chatId = getChatId();
  const runtimeName = buildRuntimeWorldbookName(settings, chatId);
  const currentBound = getChatWorldbookName('current');

  if (currentBound) {
    const entries = await findByNameAndValidate(currentBound, settings, chatId);
    if (entries) {
      return { chat_id: chatId, worldbook_name: currentBound, entries, created: false };
    }
  }

  const candidates = [runtimeName]
    .concat(
      getWorldbookNames().filter(name => name.startsWith(settings.runtime_worldbook_prefix) && name !== runtimeName),
    )
    .slice(0, settings.max_scan_worldbooks);

  for (const candidate of candidates) {
    const entries = await findByNameAndValidate(candidate, settings, chatId);
    if (!entries) {
      continue;
    }

    if (currentBound !== candidate) {
      await rebindChatWorldbook('current', candidate);
    }

    return { chat_id: chatId, worldbook_name: candidate, entries, created: false };
  }

  if (!createIfMissing) {
    throw new Error('runtime worldbook not found');
  }

  let exists = false;
  try {
    await getWorldbook(runtimeName);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    await createWorldbook(runtimeName, []);
  }

  const loaded = await getWorldbook(runtimeName);
  const withMeta = upsertMetaEntry(loaded, settings, chatId);
  await replaceWorldbook(runtimeName, withMeta, { render: 'debounced' });
  await rebindChatWorldbook('current', runtimeName);

  return {
    chat_id: chatId,
    worldbook_name: runtimeName,
    entries: withMeta,
    created: true,
  };
}

export function ensureDefaultEntry(name: string, content: string, enabled: boolean, entries: WorldbookEntry[]): WorldbookEntry {
  return defaultEntry(nextUid(entries), name, content, enabled);
}
