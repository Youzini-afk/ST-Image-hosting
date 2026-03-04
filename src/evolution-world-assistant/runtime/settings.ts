import {
  EwFlowConfig,
  EwFlowConfigSchema,
  EwSettings,
  EwSettingsSchema,
  LastIoSummary,
  LastIoSummarySchema,
  RunSummary,
  RunSummarySchema,
} from './types';
import { simpleHash } from './helpers';

type SettingsListener = (settings: EwSettings) => void;
type RunListener = (summary: RunSummary | null) => void;
type IoListener = (summary: LastIoSummary | null) => void;

type ScriptStorageShape = {
  settings?: EwSettings;
  last_run?: RunSummary | null;
  last_io?: LastIoSummary | null;
  backups?: Record<string, { at: number; worldbook_name: string; controller_content: string }>;
};

const SCRIPT_STORAGE_KEY = 'evolution_world_assistant';

const settingsListeners = new Set<SettingsListener>();
const runListeners = new Set<RunListener>();
const ioListeners = new Set<IoListener>();

let cachedSettings: EwSettings | null = null;
let cachedLastRun: RunSummary | null = null;
let cachedLastIo: LastIoSummary | null = null;

function makeDefaultFlow(index: number): EwFlowConfig {
  const id = `flow_${index}_${simpleHash(`${index}-${Date.now()}`)}`;
  return EwFlowConfigSchema.parse({
    id,
    name: `Flow ${index}`,
    enabled: true,
    priority: 100,
    timeout_ms: 8000,
    api_url: '',
    api_key: '',
    context_turns: 8,
    extract_rules: [],
    exclude_rules: [],
    request_template: '',
    headers_json: '',
  });
}

function readScriptStorage(): ScriptStorageShape {
  const variables = getVariables({ type: 'script', script_id: getScriptId() });
  const raw = _.get(variables, SCRIPT_STORAGE_KEY);
  if (!_.isPlainObject(raw)) {
    return {};
  }
  return raw as ScriptStorageShape;
}

function writeScriptStorage(updater: (storage: ScriptStorageShape) => ScriptStorageShape) {
  const option = { type: 'script', script_id: getScriptId() } as const;
  const runtime = globalThis as Record<string, unknown>;

  const readPrevious = (variables: Record<string, any>) => {
    return _.isPlainObject(_.get(variables, SCRIPT_STORAGE_KEY))
      ? (_.get(variables, SCRIPT_STORAGE_KEY) as ScriptStorageShape)
      : {};
  };

  if (typeof runtime.updateVariablesWith === 'function') {
    updateVariablesWith(variables => {
      const previous = readPrevious(variables);
      _.set(variables, SCRIPT_STORAGE_KEY, updater(previous));
      return variables;
    }, option);
    return;
  }

  if (typeof runtime.insertOrAssignVariables === 'function') {
    const variables = getVariables(option);
    const previous = readPrevious(variables);
    const nextStorage = updater(previous);
    insertOrAssignVariables({ [SCRIPT_STORAGE_KEY]: nextStorage }, option);
    return;
  }

  throw new Error('script storage API unavailable: updateVariablesWith/insertOrAssignVariables');
}

function normalizeSettings(raw: unknown): EwSettings {
  const parsed = EwSettingsSchema.safeParse(raw);
  const base = parsed.success ? parsed.data : EwSettingsSchema.parse({});
  const withFlows = base.flows.length > 0 ? base : { ...base, flows: [makeDefaultFlow(1)] };
  return EwSettingsSchema.parse(withFlows);
}

function emitSettings(settings: EwSettings) {
  settingsListeners.forEach(listener => listener(settings));
}

function emitRun(summary: RunSummary | null) {
  runListeners.forEach(listener => listener(summary));
}

function emitIo(summary: LastIoSummary | null) {
  ioListeners.forEach(listener => listener(summary));
}

export function loadSettings(): EwSettings {
  const storage = readScriptStorage();
  const normalized = normalizeSettings(storage.settings);
  cachedSettings = normalized;

  writeScriptStorage(previous => ({ ...previous, settings: normalized }));
  return normalized;
}

export function getSettings(): EwSettings {
  if (!cachedSettings) {
    cachedSettings = loadSettings();
  }
  return klona(cachedSettings);
}

export function replaceSettings(nextSettings: EwSettings): EwSettings {
  const normalized = normalizeSettings(nextSettings);
  cachedSettings = normalized;
  writeScriptStorage(previous => ({ ...previous, settings: normalized }));
  emitSettings(klona(normalized));
  return klona(normalized);
}

export function patchSettings(partial: Partial<EwSettings>): EwSettings {
  const merged = _.merge({}, getSettings(), partial);
  return replaceSettings(merged as EwSettings);
}

export function subscribeSettings(listener: SettingsListener): { stop: () => void } {
  settingsListeners.add(listener);
  return { stop: () => settingsListeners.delete(listener) };
}

export function loadLastRun(): RunSummary | null {
  const storage = readScriptStorage();
  const parsed = RunSummarySchema.safeParse(storage.last_run);
  cachedLastRun = parsed.success ? parsed.data : null;
  return cachedLastRun ? klona(cachedLastRun) : null;
}

export function getLastRun(): RunSummary | null {
  if (cachedLastRun === null) {
    return loadLastRun();
  }
  return klona(cachedLastRun);
}

export function setLastRun(summary: RunSummary) {
  const normalized = RunSummarySchema.parse(summary);
  cachedLastRun = normalized;
  writeScriptStorage(previous => ({ ...previous, last_run: normalized }));
  emitRun(klona(normalized));
}

export function subscribeLastRun(listener: RunListener): { stop: () => void } {
  runListeners.add(listener);
  return { stop: () => runListeners.delete(listener) };
}

export function loadLastIo(): LastIoSummary | null {
  const storage = readScriptStorage();
  const parsed = LastIoSummarySchema.safeParse(storage.last_io);
  cachedLastIo = parsed.success ? parsed.data : null;
  return cachedLastIo ? klona(cachedLastIo) : null;
}

export function getLastIo(): LastIoSummary | null {
  if (cachedLastIo === null) {
    return loadLastIo();
  }
  return klona(cachedLastIo);
}

export function setLastIo(summary: LastIoSummary) {
  const normalized = LastIoSummarySchema.parse(summary);
  cachedLastIo = normalized;
  writeScriptStorage(previous => ({ ...previous, last_io: normalized }));
  emitIo(klona(normalized));
}

export function subscribeLastIo(listener: IoListener): { stop: () => void } {
  ioListeners.add(listener);
  return { stop: () => ioListeners.delete(listener) };
}

export function saveControllerBackup(chatId: string, worldbookName: string, controllerContent: string) {
  writeScriptStorage(previous => {
    const backups = { ...(previous.backups ?? {}) };
    backups[chatId] = {
      at: Date.now(),
      worldbook_name: worldbookName,
      controller_content: controllerContent,
    };
    return { ...previous, backups };
  });
}

export function readControllerBackup(chatId: string): { at: number; worldbook_name: string; controller_content: string } | null {
  const storage = readScriptStorage();
  const backup = storage.backups?.[chatId];
  return backup ? klona(backup) : null;
}

export function clearControllerBackup(chatId: string) {
  writeScriptStorage(previous => {
    const backups = { ...(previous.backups ?? {}) };
    delete backups[chatId];
    return { ...previous, backups };
  });
}
