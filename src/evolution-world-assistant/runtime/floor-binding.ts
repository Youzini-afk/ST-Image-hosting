import { EwSettings } from './types';
import { resolveTargetWorldbook, ensureDefaultEntry } from './worldbook-runtime';

const EW_FLOOR_DATA_KEY = 'ew_entries';
const EW_CONTROLLER_DATA_KEY = 'ew_controller';
const EW_DYN_SNAPSHOTS_KEY = 'ew_dyn_snapshots';

type DynSnapshot = { name: string; content: string; enabled: boolean };

const floorBindingListenerStops: EventOnReturn[] = [];

// ── Floor Marking ────────────────────────────────────────────

/**
 * Mark floor entries: write entry names, Dyn content snapshots, and Controller
 * snapshot into the chat message's `data` field.
 *
 * The stored snapshots enable:
 * - Automatic orphan cleanup when individual floors are deleted
 * - Full purge + restore when switching chats (shujuku pattern)
 */
export async function markFloorEntries(
  messageId: number,
  entryNames: string[],
  controllerSnapshot?: string,
  dynSnapshots?: DynSnapshot[],
): Promise<void> {
  if (entryNames.length === 0 && !controllerSnapshot && (!dynSnapshots || dynSnapshots.length === 0)) {
    return;
  }

  const messages = getChatMessages(messageId);
  if (messages.length === 0) {
    return;
  }

  const msg = messages[0];
  const existingEntries: string[] = _.get(msg.data, EW_FLOOR_DATA_KEY, []);
  const mergedEntries = _.uniq([...existingEntries, ...entryNames]);

  const nextData: Record<string, unknown> = {
    ...msg.data,
    [EW_FLOOR_DATA_KEY]: mergedEntries,
  };
  if (controllerSnapshot !== undefined) {
    nextData[EW_CONTROLLER_DATA_KEY] = controllerSnapshot;
  }
  if (dynSnapshots && dynSnapshots.length > 0) {
    nextData[EW_DYN_SNAPSHOTS_KEY] = dynSnapshots;
  }

  await setChatMessages(
    [{ message_id: messageId, data: nextData }],
    { refresh: 'none' },
  );
}

// ── Floor Query ──────────────────────────────────────────────

/**
 * Get the EW/Dyn/ entry names bound to a specific floor.
 */
export function getFloorEntryNames(messageId: number): string[] {
  const messages = getChatMessages(messageId);
  if (messages.length === 0) {
    return [];
  }
  return _.get(messages[0].data, EW_FLOOR_DATA_KEY, []);
}

/**
 * Get all floor bindings: map of message_id -> entry names.
 */
function getAllFloorBindings(): Map<number, string[]> {
  const lastId = getLastMessageId();
  if (lastId < 0) {
    return new Map();
  }

  const bindings = new Map<number, string[]>();
  const allMessages = getChatMessages(`0-${lastId}`);

  for (const msg of allMessages) {
    const entries: string[] = _.get(msg.data, EW_FLOOR_DATA_KEY, []);
    if (entries.length > 0) {
      bindings.set(msg.message_id, entries);
    }
  }

  return bindings;
}

// ── Chat Message Scanning ─────────────────────────────────────

/**
 * Find the latest Controller snapshot from surviving chat messages.
 * Scans all messages from newest to oldest.
 */
function findLatestControllerSnapshot(): string | null {
  const lastId = getLastMessageId();
  if (lastId < 0) {
    return null;
  }

  const allMessages = getChatMessages(`0-${lastId}`);
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const snapshot: string | undefined = _.get(allMessages[i].data, EW_CONTROLLER_DATA_KEY);
    if (typeof snapshot === 'string' && snapshot.length > 0) {
      return snapshot;
    }
  }
  return null;
}

/**
 * Collect all Dyn entry snapshots from all surviving chat messages.
 * Later messages overwrite earlier ones for the same entry name (latest wins).
 */
function collectDynSnapshotsFromChat(): Map<string, DynSnapshot> {
  const lastId = getLastMessageId();
  if (lastId < 0) {
    return new Map();
  }

  const allMessages = getChatMessages(`0-${lastId}`);
  const merged = new Map<string, DynSnapshot>();

  // Iterate oldest to newest so latest wins
  for (const msg of allMessages) {
    const snapshots: DynSnapshot[] | undefined = _.get(msg.data, EW_DYN_SNAPSHOTS_KEY);
    if (Array.isArray(snapshots)) {
      for (const snap of snapshots) {
        if (snap.name && typeof snap.content === 'string') {
          merged.set(snap.name, snap);
        }
      }
    }
  }

  return merged;
}

// ── Orphan Cleanup (Floor Deletion) ──────────────────────────

/**
 * Cleanup orphaned entries when individual floors are deleted.
 * Also auto-rolls back Controller to the latest surviving snapshot.
 */
export async function cleanupOrphanedEntries(settings: EwSettings): Promise<number> {
  const target = await resolveTargetWorldbook(settings);
  const bindings = getAllFloorBindings();

  // Collect all entry names that are still validly bound to existing floors.
  const validEntryNames = new Set<string>();
  for (const entries of bindings.values()) {
    for (const name of entries) {
      validEntryNames.add(name);
    }
  }

  // If no bindings exist, this is handled by purgeAndRestoreForChat instead.
  if (bindings.size === 0) {
    return 0;
  }

  const orphanedNames: string[] = [];
  for (const entry of target.entries) {
    if (entry.name.startsWith(settings.dynamic_entry_prefix) && !validEntryNames.has(entry.name)) {
      orphanedNames.push(entry.name);
    }
  }

  // Auto-rollback Controller to latest surviving snapshot.
  let controllerRolledBack = false;
  if (orphanedNames.length > 0) {
    const latestSnapshot = findLatestControllerSnapshot();
    const ctrlEntry = target.entries.find(e => e.name === settings.controller_entry_name);
    if (latestSnapshot !== null && ctrlEntry && ctrlEntry.content !== latestSnapshot) {
      ctrlEntry.content = latestSnapshot;
      controllerRolledBack = true;
    } else if (latestSnapshot === null && ctrlEntry) {
      // No surviving snapshots → delete Controller content.
      ctrlEntry.content = '';
      ctrlEntry.enabled = false;
      controllerRolledBack = true;
    }
  }

  if (orphanedNames.length === 0 && !controllerRolledBack) {
    return 0;
  }

  const orphanSet = new Set(orphanedNames);
  const filteredEntries = target.entries.filter(entry => !orphanSet.has(entry.name));
  await replaceWorldbook(target.worldbook_name, filteredEntries, { render: 'debounced' });

  if (controllerRolledBack) {
    console.info(`[Evolution World] Controller auto-rolled back to latest surviving snapshot`);
  }

  return orphanedNames.length;
}

// ── Full Purge + Restore (Chat Switch) ──────────────────────

/**
 * Purge all EW-generated entries from worldbook, then restore from the
 * current chat's message data snapshots.
 *
 * Called on CHAT_CHANGED to ensure clean state for each chat.
 * Follows shujuku's pattern: worldbook entries are ephemeral derivatives
 * of the chat message data (source of truth).
 */
export async function purgeAndRestoreForChat(settings: EwSettings): Promise<void> {
  const target = await resolveTargetWorldbook(settings);

  // Step 1: Remove all EW/Dyn/* entries and clear EW/Controller.
  let nextEntries = target.entries.filter(
    entry => !entry.name.startsWith(settings.dynamic_entry_prefix),
  );
  const ctrlEntry = nextEntries.find(e => e.name === settings.controller_entry_name);
  if (ctrlEntry) {
    ctrlEntry.content = '';
    ctrlEntry.enabled = false;
  }

  // Step 2: Restore from current chat's message data.
  const dynSnapshots = collectDynSnapshotsFromChat();
  const controllerSnapshot = findLatestControllerSnapshot();

  if (dynSnapshots.size > 0) {
    for (const snap of dynSnapshots.values()) {
      const existing = nextEntries.find(e => e.name === snap.name);
      if (existing) {
        existing.content = snap.content;
        existing.enabled = snap.enabled;
      } else {
        nextEntries.push(
          ensureDefaultEntry(snap.name, snap.content, snap.enabled, nextEntries),
        );
      }
    }
  }

  if (controllerSnapshot && ctrlEntry) {
    ctrlEntry.content = controllerSnapshot;
    ctrlEntry.enabled = true;
  } else if (controllerSnapshot) {
    nextEntries.push(
      ensureDefaultEntry(settings.controller_entry_name, controllerSnapshot, true, nextEntries, true),
    );
  }

  // Step 3: Commit the cleaned + restored worldbook.
  await replaceWorldbook(target.worldbook_name, nextEntries, { render: 'debounced' });

  const restoredDyn = dynSnapshots.size;
  const restoredCtrl = controllerSnapshot ? 1 : 0;
  console.info(
    `[Evolution World] Chat switch: purged old entries, restored ${restoredDyn} Dyn + ${restoredCtrl} Controller from chat snapshots`,
  );
}

// ── Event Handlers ──────────────────────────────────────────

/**
 * Handle chat changes: purge + restore on chat switch, cleanup orphans on floor deletion.
 */
async function onChatChanged(settings: EwSettings): Promise<void> {
  try {
    // Always run purge+restore first to handle chat switches cleanly.
    await purgeAndRestoreForChat(settings);

    // Then run orphan cleanup for any floor deletions within the same chat.
    if (settings.auto_cleanup_orphans) {
      const cleaned = await cleanupOrphanedEntries(settings);
      if (cleaned > 0) {
        console.info(`[Evolution World] cleaned up ${cleaned} orphaned entries`);
      }
    }
  } catch (error) {
    console.warn('[Evolution World] chat change handling failed:', error);
  }
}

/**
 * Initialize floor binding event listeners.
 */
export function initFloorBindingEvents(getSettings: () => EwSettings): void {
  disposeFloorBindingEvents();

  floorBindingListenerStops.push(
    eventOn(tavern_events.CHAT_CHANGED, () => {
      const currentSettings = getSettings();
      if (currentSettings.enabled && currentSettings.floor_binding_enabled) {
        // Delay to allow chat to fully load, then re-read settings to avoid stale closure.
        setTimeout(() => {
          const freshSettings = getSettings();
          if (freshSettings.enabled && freshSettings.floor_binding_enabled) {
            onChatChanged(freshSettings);
          }
        }, 500);
      }
    }),
  );
}

/**
 * Dispose floor binding event listeners.
 */
export function disposeFloorBindingEvents(): void {
  for (const stopper of floorBindingListenerStops.splice(0, floorBindingListenerStops.length)) {
    stopper.stop();
  }
}
