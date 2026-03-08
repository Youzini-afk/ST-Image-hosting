/**
 * File-based snapshot storage via ST's /api/files endpoint.
 *
 * Stores per-message worldbook snapshots (Dyn entries + Controller)
 * as JSON files on the server, keeping chat message data lightweight.
 *
 * File naming: ew__{charName}__{chatId}__msg-{messageId}.json
 * (flat layout — ST file API doesn't support subdirectories)
 */

export type SnapshotData = {
  controller: string;
  dyn_entries: Array<{ name: string; content: string; enabled: boolean }>;
};

// ── Helpers ──────────────────────────────────────────────────

function sanitizeSegment(s: string): string {
  // Only allow alphanumeric, underscore, hyphen
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

function buildFileName(charName: string, chatId: string, messageId: number): string {
  return `ew__${sanitizeSegment(charName)}__${sanitizeSegment(chatId)}__msg-${messageId}.json`;
}

function buildFilePrefix(charName: string, chatId: string): string {
  return `ew__${sanitizeSegment(charName)}__${sanitizeSegment(chatId)}__`;
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // ST may require CSRF token
  if (typeof SillyTavern !== 'undefined' && SillyTavern.getRequestHeaders) {
    const stHeaders = SillyTavern.getRequestHeaders();
    if (stHeaders && typeof stHeaders === 'object') {
      Object.assign(headers, stHeaders);
    }
  }
  return headers;
}

// ── Write ────────────────────────────────────────────────────

export async function writeSnapshot(
  charName: string,
  chatId: string,
  messageId: number,
  data: SnapshotData,
): Promise<string> {
  const fileName = buildFileName(charName, chatId, messageId);
  const jsonContent = JSON.stringify(data);
  const base64Content = btoa(unescape(encodeURIComponent(jsonContent)));

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ name: fileName, data: base64Content }),
  });

  if (!response.ok) {
    throw new Error(`[EW] Failed to write snapshot file "${fileName}": ${response.status} ${response.statusText}`);
  }

  console.debug(`[Evolution World] Snapshot written: ${fileName}`);
  return fileName;
}

// ── Read ─────────────────────────────────────────────────────

export async function readSnapshot(fileName: string): Promise<SnapshotData | null> {
  try {
    const response = await fetch(`/user/files/${fileName}`);
    if (!response.ok) {
      console.debug(`[Evolution World] Snapshot file not found: ${fileName}`);
      return null;
    }
    const data = await response.json();
    if (data && typeof data.controller === 'string' && Array.isArray(data.dyn_entries)) {
      return data as SnapshotData;
    }
    console.warn(`[Evolution World] Invalid snapshot format: ${fileName}`);
    return null;
  } catch (e) {
    console.warn(`[Evolution World] Failed to read snapshot: ${fileName}`, e);
    return null;
  }
}

// ── Delete ───────────────────────────────────────────────────

export async function deleteSnapshot(fileName: string): Promise<void> {
  try {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ path: `user/files/${fileName}` }),
    });
    if (response.ok) {
      console.debug(`[Evolution World] Snapshot deleted: ${fileName}`);
    }
  } catch (e) {
    console.warn(`[Evolution World] Failed to delete snapshot: ${fileName}`, e);
  }
}

// ── Batch Operations ─────────────────────────────────────────

/**
 * Find all snapshot files for a given chat.
 * Uses /api/files/verify with a set of candidate filenames.
 *
 * Since ST doesn't provide a "list files" API, we verify files
 * based on message IDs found in the current chat.
 */
export async function findSnapshotFiles(
  charName: string,
  chatId: string,
  messageIds: number[],
): Promise<string[]> {
  const prefix = buildFilePrefix(charName, chatId);
  const candidates = messageIds.map(id => `user/files/${prefix}msg-${id}.json`);

  if (candidates.length === 0) return [];

  try {
    const response = await fetch('/api/files/verify', {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ urls: candidates }),
    });
    if (!response.ok) return [];

    const result = await response.json() as Record<string, boolean>;
    return Object.entries(result)
      .filter(([, exists]) => exists)
      .map(([url]) => url.replace('user/files/', ''));
  } catch (e) {
    console.warn('[Evolution World] Failed to verify snapshot files:', e);
    return [];
  }
}

/**
 * Delete all snapshot files for a given chat that are NOT in the keep list.
 */
export async function cleanupSnapshotFiles(
  charName: string,
  chatId: string,
  allMessageIds: number[],
  keepFileNames: Set<string>,
): Promise<number> {
  const allFiles = await findSnapshotFiles(charName, chatId, allMessageIds);
  let deleted = 0;
  for (const file of allFiles) {
    if (!keepFileNames.has(file)) {
      await deleteSnapshot(file);
      deleted++;
    }
  }
  return deleted;
}

// ── Migration ────────────────────────────────────────────────

export { buildFileName, buildFilePrefix };
