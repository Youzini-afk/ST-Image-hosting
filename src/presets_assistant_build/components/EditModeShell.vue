<template>
  <section class="edit-shell">
    <header class="toolbar">
      <div class="toolbar-left">
        <label class="mode">
          <span>提交策略</span>
          <select :value="applyMode" class="input" @change="emitApplyMode(($event.target as HTMLSelectElement).value)">
            <option value="live">实时</option>
            <option value="draft">草稿</option>
          </select>
        </label>
        <input
          class="input search"
          :value="promptQuery"
          type="text"
          placeholder="搜索 Prompt name / id / role"
          @input="$emit('update-prompt-query', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="actions">
        <button class="btn" type="button" :disabled="!dirty || saving" @click="$emit('discard')">丢弃</button>
        <button class="btn primary" type="button" :disabled="!dirty || saving" @click="$emit('save')">
          {{ saving ? '保存中...' : '保存到预设' }}
        </button>
      </div>
    </header>

    <div v-if="draftPreset" class="content">
      <aside class="sidebar">
        <div class="sidebar-head">
          <strong>Prompt 条目</strong>
          <button class="btn mini" type="button" @click="$emit('append-prompt')">新增</button>
        </div>
        <button
          v-for="index in promptIndices"
          :key="`${draftPreset.prompts[index]?.id || 'prompt'}-${index}`"
          class="prompt-item"
          :class="{ active: index === selectedPromptIndex }"
          type="button"
          @click="$emit('set-selected-prompt-index', index)"
        >
          <span>{{ draftPreset.prompts[index]?.name || draftPreset.prompts[index]?.id || `Prompt ${index + 1}` }}</span>
          <small>{{ draftPreset.prompts[index]?.id }} · {{ draftPreset.prompts[index]?.role }}</small>
        </button>
        <div v-if="promptIndices.length < 1" class="empty-side">无匹配条目</div>
      </aside>

      <main v-if="selectedPrompt" class="editor">
        <section class="panel">
          <h4>Prompt 详情</h4>
          <label class="field">
            <span>名称</span>
            <input class="input" :value="selectedPrompt.name" type="text" @input="updatePromptName($event)" />
          </label>
          <label class="field">
            <span>ID</span>
            <input class="input" :value="selectedPrompt.id" type="text" @input="updatePromptId($event)" />
          </label>
          <div class="row">
            <label class="field">
              <span>角色</span>
              <select class="input" :value="selectedPrompt.role" @change="updatePromptRole($event)">
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </label>
            <label class="field">
              <span>位置</span>
              <select class="input" :value="selectedPositionType" @change="updatePromptPositionType($event)">
                <option value="relative">relative</option>
                <option value="in_chat">in_chat</option>
              </select>
            </label>
          </div>
          <div v-if="selectedPositionType === 'in_chat'" class="row">
            <label class="field">
              <span>Depth</span>
              <input
                class="input"
                :value="selectedPrompt.position.type === 'in_chat' ? selectedPrompt.position.depth : 0"
                type="number"
                step="1"
                @input="updatePromptDepth($event)"
              />
            </label>
            <label class="field">
              <span>Order</span>
              <input
                class="input"
                :value="selectedPrompt.position.type === 'in_chat' ? selectedPrompt.position.order : 0"
                type="number"
                step="1"
                @input="updatePromptOrder($event)"
              />
            </label>
          </div>
          <label class="check">
            <input :checked="selectedPrompt.enabled" type="checkbox" @change="updatePromptEnabled($event)" />
            <span>启用此条目</span>
          </label>
          <label class="field">
            <span>内容</span>
            <textarea class="input textarea" :value="selectedPrompt.content ?? ''" @input="updatePromptContent($event)"></textarea>
          </label>
          <div class="ops">
            <button class="btn mini" type="button" @click="$emit('move-prompt', selectedPromptIndex, -1)">上移</button>
            <button class="btn mini" type="button" @click="$emit('move-prompt', selectedPromptIndex, 1)">下移</button>
            <button class="btn mini danger" type="button" @click="$emit('remove-prompt', selectedPromptIndex)">删除</button>
          </div>
        </section>

        <section class="panel">
          <h4>完整参数编辑</h4>
          <details v-for="group in groups" :key="group.id" class="group">
            <summary>{{ group.title }}</summary>
            <div class="fields">
              <label v-for="field in group.fields" :key="String(field.key)" class="field">
                <span>{{ field.label }}</span>
                <input
                  v-if="field.type === 'number'"
                  class="input"
                  type="number"
                  :value="toNumberInputValue(draftPreset.settings[field.key])"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step ?? 1"
                  @input="updateSettingNumber(field.key, $event)"
                />
                <select
                  v-else-if="field.type === 'select'"
                  class="input"
                  :value="String(draftPreset.settings[field.key])"
                  @change="updateSettingSelect(field.key, $event)"
                >
                  <option v-for="option in field.options" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <label v-else class="check">
                  <input
                    :checked="Boolean(draftPreset.settings[field.key])"
                    type="checkbox"
                    @change="updateSettingBoolean(field.key, $event)"
                  />
                  <span>{{ Boolean(draftPreset.settings[field.key]) ? '开启' : '关闭' }}</span>
                </label>
              </label>
            </div>
          </details>
        </section>
      </main>
      <div v-else class="empty">当前预设没有可编辑的 Prompt</div>
    </div>

    <div v-else class="empty">请先选择预设</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { clonePreset, presetSettingGroups } from '../core/presetMapper';
import type { EditApplyMode } from '../types';

const props = defineProps<{
  draftPreset: Preset | null;
  dirty: boolean;
  applyMode: EditApplyMode;
  selectedPromptIndex: number;
  saving: boolean;
  promptIndices: number[];
  promptQuery: string;
}>();

const emit = defineEmits<{
  save: [];
  discard: [];
  'append-prompt': [];
  'remove-prompt': [index: number];
  'move-prompt': [index: number, direction: -1 | 1];
  'set-selected-prompt-index': [index: number];
  'update-apply-mode': [mode: EditApplyMode];
  'update-prompt-query': [query: string];
  'update-draft': [preset: Preset];
}>();

const groups = presetSettingGroups;

const selectedPrompt = computed(() => {
  if (!props.draftPreset) {
    return null;
  }
  return props.draftPreset.prompts[props.selectedPromptIndex] ?? null;
});

const selectedPositionType = computed(() => {
  if (!selectedPrompt.value) {
    return 'relative';
  }
  return selectedPrompt.value.position.type;
});

function emitApplyMode(modeRaw: string): void {
  const mode: EditApplyMode = modeRaw === 'draft' ? 'draft' : 'live';
  emit('update-apply-mode', mode);
}

function mutateDraft(mutator: (draft: Preset) => void): void {
  if (!props.draftPreset) {
    return;
  }
  const draft = clonePreset(props.draftPreset);
  mutator(draft);
  emit('update-draft', draft);
}

function toNumberInputValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function updatePromptName(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt) {
      prompt.name = value;
    }
  });
}

function updatePromptId(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt) {
      prompt.id = value;
    }
  });
}

function updatePromptRole(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as PresetPrompt['role'];
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt) {
      prompt.role = value;
    }
  });
}

function updatePromptPositionType(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (!prompt) {
      return;
    }
    if (value === 'in_chat') {
      prompt.position = { type: 'in_chat', depth: 4, order: 100 };
      return;
    }
    prompt.position = { type: 'relative' };
  });
}

function updatePromptDepth(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) {
    return;
  }
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt?.position.type === 'in_chat') {
      prompt.position.depth = Math.max(0, Math.floor(value));
    }
  });
}

function updatePromptOrder(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) {
    return;
  }
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt?.position.type === 'in_chat') {
      prompt.position.order = Math.floor(value);
    }
  });
}

function updatePromptEnabled(event: Event): void {
  const value = (event.target as HTMLInputElement).checked;
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt) {
      prompt.enabled = value;
    }
  });
}

function updatePromptContent(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  mutateDraft(draft => {
    const prompt = draft.prompts[props.selectedPromptIndex];
    if (prompt) {
      prompt.content = value;
    }
  });
}

function updateSettingNumber(key: keyof Preset['settings'], event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isNaN(value)) {
    return;
  }
  mutateDraft(draft => {
    draft.settings[key] = value as Preset['settings'][keyof Preset['settings']];
  });
}

function updateSettingSelect(key: keyof Preset['settings'], event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  mutateDraft(draft => {
    draft.settings[key] = value as Preset['settings'][keyof Preset['settings']];
  });
}

function updateSettingBoolean(key: keyof Preset['settings'], event: Event): void {
  const value = (event.target as HTMLInputElement).checked;
  mutateDraft(draft => {
    draft.settings[key] = value as Preset['settings'][keyof Preset['settings']];
  });
}
</script>

<style scoped>
.edit-shell {
  border: 1px solid var(--pa-border-strong);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(8, 15, 30, 0.94), rgba(6, 11, 23, 0.94));
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.toolbar {
  padding: 12px 14px;
  border-bottom: 1px solid var(--pa-border);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-left {
  min-width: 320px;
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
}

.mode {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pa-text-2);
  font-size: 12px;
}

.input,
.textarea {
  border: 1px solid var(--pa-border-strong);
  border-radius: 8px;
  background: rgba(13, 24, 45, 0.9);
  color: var(--pa-text-1);
  min-height: 34px;
  padding: 0 9px;
}

.search {
  width: 100%;
}

.actions {
  display: inline-flex;
  gap: 8px;
}

.btn {
  border: 1px solid var(--pa-border-strong);
  border-radius: 8px;
  min-height: 34px;
  padding: 0 12px;
  color: var(--pa-text-1);
  background: rgba(22, 36, 66, 0.75);
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg, #2a5ec4, #2f73df);
  border-color: #3c7bf1;
}

.btn.danger {
  background: rgba(108, 25, 40, 0.75);
  border-color: #d64d5e;
}

.btn.mini {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.content {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
}

.sidebar {
  border-right: 1px solid var(--pa-border);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.sidebar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--pa-text-2);
}

.prompt-item {
  border: 1px solid var(--pa-border);
  border-radius: 9px;
  background: rgba(14, 24, 44, 0.8);
  color: var(--pa-text-1);
  text-align: left;
  padding: 8px 9px;
  display: grid;
  gap: 2px;
  cursor: pointer;
}

.prompt-item small {
  color: var(--pa-text-3);
  font-size: 11px;
}

.prompt-item.active {
  border-color: #3c7bf1;
  box-shadow: 0 0 0 1px rgba(60, 123, 241, 0.34) inset;
}

.editor {
  min-height: 0;
  overflow: auto;
  padding: 10px;
  display: grid;
  gap: 10px;
}

.panel {
  border: 1px solid var(--pa-border);
  border-radius: 10px;
  padding: 10px;
  background: rgba(10, 20, 39, 0.7);
  display: grid;
  gap: 8px;
}

.panel h4 {
  margin: 0;
  color: var(--pa-text-1);
  font-size: 14px;
}

.field {
  display: grid;
  gap: 5px;
}

.field > span {
  color: var(--pa-text-2);
  font-size: 12px;
}

.row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.textarea {
  min-height: 160px;
  padding: 8px 9px;
}

.check {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pa-text-1);
}

.ops {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.group {
  border: 1px solid var(--pa-border);
  border-radius: 9px;
  background: rgba(14, 24, 44, 0.7);
}

.group > summary {
  list-style: none;
  cursor: pointer;
  padding: 8px 9px;
  border-bottom: 1px solid rgba(72, 98, 138, 0.45);
  color: var(--pa-text-1);
}

.group .fields {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 8px;
}

.empty,
.empty-side {
  color: var(--pa-text-3);
  text-align: center;
  padding: 18px;
}

@media (max-width: 1120px) {
  .content {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--pa-border);
    max-height: 260px;
  }
}

@media (max-width: 760px) {
  .toolbar-left {
    min-width: 0;
    grid-template-columns: 1fr;
  }

  .row,
  .group .fields {
    grid-template-columns: 1fr;
  }
}
</style>
