import { MergedPlan, EwSettings } from './types';
import { ensureRuntimeWorldbook, ensureDefaultEntry } from './worldbook-runtime';
import { saveControllerBackup } from './settings';

type CommitResult = {
  worldbook_name: string;
  chat_id: string;
  changed_count: number;
};

function findEntry(entries: WorldbookEntry[], name: string): WorldbookEntry | undefined {
  return entries.find(entry => entry.name === name);
}

function isManagedEntryName(settings: EwSettings, name: string): boolean {
  if (name === settings.controller_entry_name) {
    return true;
  }
  if (name === settings.meta_entry_name) {
    return true;
  }
  return name.startsWith(settings.dynamic_entry_prefix);
}

function upsertEntry(entries: WorldbookEntry[], name: string, content: string, enabled: boolean): WorldbookEntry[] {
  const cloned = klona(entries);
  const existing = findEntry(cloned, name);
  if (existing) {
    existing.content = content;
    existing.enabled = enabled;
    return cloned;
  }

  cloned.push(ensureDefaultEntry(name, content, enabled, cloned));
  return cloned;
}

function deleteByNames(entries: WorldbookEntry[], names: string[]): WorldbookEntry[] {
  if (names.length === 0) {
    return klona(entries);
  }

  const nameSet = new Set(names);
  return entries.filter(entry => !nameSet.has(entry.name));
}

function toggleEntries(entries: WorldbookEntry[], toggles: Array<{ name: string; enabled: boolean }>): WorldbookEntry[] {
  const cloned = klona(entries);
  for (const toggle of toggles) {
    const entry = findEntry(cloned, toggle.name);
    if (!entry) {
      throw new Error(`toggle target entry not found: ${toggle.name}`);
    }
    entry.enabled = toggle.enabled;
  }
  return cloned;
}

function buildMetaContent(settings: EwSettings, chatId: string, requestId: string): string {
  return `${settings.meta_marker}\nchat_id=${chatId}\nrequest_id=${requestId}\nupdated_at=${Date.now()}`;
}

export async function commitMergedPlan(
  settings: EwSettings,
  mergedPlan: MergedPlan,
  controllerTemplate: string,
  requestId: string,
): Promise<CommitResult> {
  const runtime = await ensureRuntimeWorldbook(settings, true);
  const beforeEntries = runtime.entries;

  const previousController = findEntry(beforeEntries, settings.controller_entry_name)?.content ?? '';
  saveControllerBackup(runtime.chat_id, runtime.worldbook_name, previousController);

  const allNames = [
    ...mergedPlan.worldbook.upsert_entries.map(entry => entry.name),
    ...mergedPlan.worldbook.delete_entries.map(entry => entry.name),
    ...mergedPlan.worldbook.toggle_entries.map(entry => entry.name),
  ];
  const unmanaged = allNames.filter(name => !isManagedEntryName(settings, name));
  if (unmanaged.length > 0) {
    throw new Error(`unmanaged entry name(s): ${unmanaged.join(', ')}`);
  }

  let nextEntries = deleteByNames(beforeEntries, mergedPlan.worldbook.delete_entries.map(entry => entry.name));

  for (const upsert of mergedPlan.worldbook.upsert_entries) {
    nextEntries = upsertEntry(nextEntries, upsert.name, upsert.content, upsert.enabled);
  }

  nextEntries = toggleEntries(nextEntries, mergedPlan.worldbook.toggle_entries);

  nextEntries = upsertEntry(nextEntries, settings.controller_entry_name, controllerTemplate, true);
  nextEntries = upsertEntry(
    nextEntries,
    settings.meta_entry_name,
    buildMetaContent(settings, runtime.chat_id, requestId),
    true,
  );

  await replaceWorldbook(runtime.worldbook_name, nextEntries, { render: 'debounced' });

  return {
    worldbook_name: runtime.worldbook_name,
    chat_id: runtime.chat_id,
    changed_count: nextEntries.length,
  };
}
