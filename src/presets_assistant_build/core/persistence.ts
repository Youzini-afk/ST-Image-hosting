import { klona } from 'klona';
import _ from 'lodash';

import type {
  ApiBindingMode,
  ConnectionSnapshot,
  EditApplyMode,
  PresetAssistantMeta,
  PresetAssistantStateV1,
  PresetAssistantStateV2,
  UiMode,
} from '../types';

const STORAGE_KEY = '__preset_assistant_state_v1__';

export function createDefaultAssistantState(): PresetAssistantStateV2 {
  return {
    version: 2,
    ui: {
      mode: 'browse',
      browse_param_panel_open: true,
      browse_param_last_expanded_group: 'context',
      api_binding_mode: 'sticky_connection',
      edit_apply_mode: 'live',
      last_selected_preset: '',
    },
    meta_by_preset: {},
    tag_catalog: [],
    sticky_connection_snapshot: null,
  };
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map(item => normalizeString(item).trim()).filter(Boolean))];
}

function normalizeMeta(value: unknown): PresetAssistantMeta {
  const raw = _.isPlainObject(value) ? (value as Record<string, unknown>) : {};
  return {
    favorite: raw.favorite === true,
    tags: normalizeStringArray(raw.tags),
    note: normalizeString(raw.note),
    updated_at: _.isNumber(raw.updated_at) ? raw.updated_at : 0,
  };
}

function normalizeMetaMap(value: unknown): Record<string, PresetAssistantMeta> {
  if (!_.isPlainObject(value)) {
    return {};
  }
  const result: Record<string, PresetAssistantMeta> = {};
  for (const [key, meta] of Object.entries(value)) {
    const name = normalizeString(key).trim();
    if (!name) {
      continue;
    }
    result[name] = normalizeMeta(meta);
  }
  return result;
}

function normalizeBindingMode(value: unknown): ApiBindingMode {
  return value === 'follow_preset' ? 'follow_preset' : 'sticky_connection';
}

function normalizeEditApplyMode(value: unknown): EditApplyMode {
  return value === 'draft' ? 'draft' : 'live';
}

function normalizeUiMode(value: unknown): UiMode {
  return value === 'edit' ? 'edit' : 'browse';
}

function normalizeConnectionSnapshot(value: unknown): ConnectionSnapshot | null {
  if (!_.isPlainObject(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    api_source: normalizeString(raw.api_source),
    profile_name: normalizeString(raw.profile_name),
    model_name: normalizeString(raw.model_name),
    api_url: normalizeString(raw.api_url),
  };
}

function normalizeV2State(input: Record<string, unknown>): PresetAssistantStateV2 {
  const base = createDefaultAssistantState();
  const uiRaw = _.isPlainObject(input.ui) ? (input.ui as Record<string, unknown>) : {};

  return {
    version: 2,
    ui: {
      mode: normalizeUiMode(uiRaw.mode),
      browse_param_panel_open:
        typeof uiRaw.browse_param_panel_open === 'boolean'
          ? uiRaw.browse_param_panel_open
          : base.ui.browse_param_panel_open,
      browse_param_last_expanded_group:
        normalizeString(uiRaw.browse_param_last_expanded_group, base.ui.browse_param_last_expanded_group) ||
        base.ui.browse_param_last_expanded_group,
      api_binding_mode: normalizeBindingMode(uiRaw.api_binding_mode),
      edit_apply_mode: normalizeEditApplyMode(uiRaw.edit_apply_mode),
      last_selected_preset: normalizeString(uiRaw.last_selected_preset),
    },
    meta_by_preset: normalizeMetaMap(input.meta_by_preset),
    tag_catalog: normalizeStringArray(input.tag_catalog),
    sticky_connection_snapshot: normalizeConnectionSnapshot(input.sticky_connection_snapshot),
  };
}

function normalizeV1State(input: Record<string, unknown>): PresetAssistantStateV1 {
  const base = createDefaultAssistantState();
  const uiRaw = _.isPlainObject(input.ui) ? (input.ui as Record<string, unknown>) : {};
  return {
    version: 1,
    ui: {
      browse_param_panel_open:
        typeof uiRaw.browse_param_panel_open === 'boolean'
          ? uiRaw.browse_param_panel_open
          : base.ui.browse_param_panel_open,
      browse_param_last_expanded_group:
        normalizeString(uiRaw.browse_param_last_expanded_group, base.ui.browse_param_last_expanded_group) ||
        base.ui.browse_param_last_expanded_group,
      api_binding_mode: normalizeBindingMode(uiRaw.api_binding_mode),
      edit_apply_mode: normalizeEditApplyMode(uiRaw.edit_apply_mode),
      last_selected_preset: normalizeString(uiRaw.last_selected_preset),
    },
    meta_by_preset: normalizeMetaMap(input.meta_by_preset),
    tag_catalog: normalizeStringArray(input.tag_catalog),
    sticky_connection_snapshot: normalizeConnectionSnapshot(input.sticky_connection_snapshot),
  };
}

function migrateV1ToV2(v1: PresetAssistantStateV1): PresetAssistantStateV2 {
  const base = createDefaultAssistantState();
  return {
    version: 2,
    ui: {
      mode: base.ui.mode,
      browse_param_panel_open: v1.ui.browse_param_panel_open,
      browse_param_last_expanded_group: v1.ui.browse_param_last_expanded_group,
      api_binding_mode: v1.ui.api_binding_mode,
      edit_apply_mode: v1.ui.edit_apply_mode,
      last_selected_preset: v1.ui.last_selected_preset,
    },
    meta_by_preset: v1.meta_by_preset,
    tag_catalog: v1.tag_catalog,
    sticky_connection_snapshot: v1.sticky_connection_snapshot,
  };
}

export function normalizeAssistantState(input: unknown): PresetAssistantStateV2 {
  if (!_.isPlainObject(input)) {
    return createDefaultAssistantState();
  }
  const raw = input as Record<string, unknown>;
  const version = Number(raw.version);
  if (version === 1) {
    return migrateV1ToV2(normalizeV1State(raw));
  }
  return normalizeV2State(raw);
}

export function readAssistantState(): PresetAssistantStateV2 {
  try {
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    return normalizeAssistantState(variables[STORAGE_KEY]);
  } catch (error) {
    console.warn('[PresetAssistant] read state failed:', error);
    return createDefaultAssistantState();
  }
}

export function writeAssistantState(state: PresetAssistantStateV2): void {
  try {
    const normalized = normalizeAssistantState(state);
    const variables = getVariables({ type: 'script', script_id: getScriptId() });
    variables[STORAGE_KEY] = normalized;
    replaceVariables(variables, { type: 'script', script_id: getScriptId() });
  } catch (error) {
    console.warn('[PresetAssistant] write state failed:', error);
  }
}

export function mutateAssistantState(
  state: PresetAssistantStateV2,
  mutator: (draft: PresetAssistantStateV2) => void,
): PresetAssistantStateV2 {
  const draft = klona(state);
  mutator(draft);
  return normalizeAssistantState(draft);
}
