<template>
  <section class="settings-panel">
    <header class="head">
      <div class="title-wrap">
        <h3>生成参数</h3>
        <p>核心参数可直接调节，高级参数折叠显示，点击“应用”提交</p>
      </div>
      <span v-if="dirty" class="dirty-dot">未应用</span>
    </header>

    <div class="core-grid">
      <label v-for="field in coreFields" :key="String(field.key)" class="field">
        <span>
          {{ field.label }}
          <i v-if="isFieldChanged(field)">已改</i>
        </span>

        <input
          v-if="field.type === 'number'"
          :value="toNumberInputValue(stagedSettings[field.key])"
          type="number"
          class="input"
          :min="field.min"
          :max="field.max"
          :step="field.step ?? 1"
          @input="onNumberInput(field, $event)"
        />

        <select
          v-else-if="field.type === 'select'"
          class="input"
          :value="String(stagedSettings[field.key])"
          @change="onSelectInput(field, $event)"
        >
          <option v-for="option in field.options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <label v-else class="check">
          <input
            :checked="Boolean(stagedSettings[field.key])"
            type="checkbox"
            @change="onBooleanInput(field, $event)"
          />
          <span>{{ Boolean(stagedSettings[field.key]) ? '开启' : '关闭' }}</span>
        </label>
      </label>
    </div>

    <div class="advanced-head">
      <button class="toggle-btn" type="button" @click="$emit('toggle-open', !open)">
        {{ open ? '收起高级参数' : '展开高级参数' }}
      </button>
    </div>

    <div v-if="open" class="groups">
      <details
        v-for="group in advancedGroups"
        :key="group.id"
        :open="group.id === expandedGroup"
        class="group"
        @toggle="onGroupToggle(group.id, $event)"
      >
        <summary>{{ group.title }}</summary>
        <div class="fields">
          <label v-for="field in group.fields" :key="String(field.key)" class="field">
            <span>
              {{ field.label }}
              <i v-if="isFieldChanged(field)">已改</i>
            </span>

            <input
              v-if="field.type === 'number'"
              :value="toNumberInputValue(stagedSettings[field.key])"
              type="number"
              class="input"
              :min="field.min"
              :max="field.max"
              :step="field.step ?? 1"
              @input="onNumberInput(field, $event)"
            />

            <select
              v-else-if="field.type === 'select'"
              class="input"
              :value="String(stagedSettings[field.key])"
              @change="onSelectInput(field, $event)"
            >
              <option v-for="option in field.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <label v-else class="check">
              <input
                :checked="Boolean(stagedSettings[field.key])"
                type="checkbox"
                @change="onBooleanInput(field, $event)"
              />
              <span>{{ Boolean(stagedSettings[field.key]) ? '开启' : '关闭' }}</span>
            </label>
          </label>
        </div>
      </details>
    </div>

    <footer class="actions">
      <button class="btn" type="button" :disabled="!dirty || applying" @click="$emit('reset')">重置</button>
      <button class="btn primary" type="button" :disabled="!dirty || applying" @click="$emit('apply')">
        {{ applying ? '应用中...' : '应用' }}
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed } from 'vue';

import { coreSettingKeys, presetSettingGroups } from '../core/presetMapper';
import type { SettingField } from '../types';

const props = defineProps<{
  stagedSettings: Preset['settings'];
  baseSettings: Preset['settings'];
  dirty: boolean;
  applying: boolean;
  open: boolean;
  expandedGroup: string;
}>();

const emit = defineEmits<{
  apply: [];
  reset: [];
  'toggle-open': [open: boolean];
  'set-expanded-group': [groupId: string];
  'update-setting': [key: keyof Preset['settings'], value: Preset['settings'][keyof Preset['settings']]];
}>();

const coreFields = computed(() => {
  const allFields = presetSettingGroups.flatMap(group => group.fields);
  return coreSettingKeys.map(key => allFields.find(field => field.key === key)).filter(Boolean) as SettingField[];
});

const advancedGroups = computed(() => {
  return presetSettingGroups
    .map(group => ({
      ...group,
      fields: group.fields.filter(field => !coreSettingKeys.includes(field.key)),
    }))
    .filter(group => group.fields.length > 0);
});

function isFieldChanged(field: SettingField): boolean {
  return !_.isEqual(props.baseSettings[field.key], props.stagedSettings[field.key]);
}

function toNumberInputValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function onGroupToggle(groupId: string, event: Event): void {
  const target = event.target as HTMLDetailsElement;
  if (target.open) {
    emit('set-expanded-group', groupId);
  }
}

function onNumberInput(field: SettingField, event: Event): void {
  const target = event.target as HTMLInputElement;
  const next = Number(target.value);
  if (Number.isNaN(next)) {
    return;
  }
  emit('update-setting', field.key, next as Preset['settings'][keyof Preset['settings']]);
}

function onSelectInput(field: SettingField, event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit('update-setting', field.key, target.value as Preset['settings'][keyof Preset['settings']]);
}

function onBooleanInput(field: SettingField, event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update-setting', field.key, target.checked as Preset['settings'][keyof Preset['settings']]);
}
</script>

<style scoped>
.settings-panel {
  border: 1px solid var(--pa-border-strong);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(8, 15, 30, 0.94), rgba(6, 11, 23, 0.94));
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  min-height: 0;
}

.head {
  padding: 12px 14px;
  border-bottom: 1px solid var(--pa-border);
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}

.title-wrap h3 {
  margin: 0;
  color: var(--pa-text-1);
  font-size: 15px;
}

.title-wrap p {
  margin: 4px 0 0;
  color: var(--pa-text-3);
  font-size: 12px;
}

.dirty-dot {
  align-self: center;
  color: var(--pa-warning);
  font-size: 12px;
}

.core-grid {
  padding: 10px 14px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid var(--pa-border);
}

.advanced-head {
  padding: 8px 14px;
  border-bottom: 1px solid var(--pa-border);
}

.toggle-btn {
  border: 1px solid var(--pa-border-strong);
  background: rgba(22, 36, 66, 0.72);
  color: var(--pa-text-2);
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  cursor: pointer;
}

.groups {
  min-height: 0;
  overflow: auto;
  padding: 8px;
  display: grid;
  gap: 8px;
}

.group {
  border: 1px solid var(--pa-border);
  border-radius: 10px;
  background: rgba(10, 20, 39, 0.7);
}

.group > summary {
  list-style: none;
  cursor: pointer;
  padding: 9px 10px;
  color: var(--pa-text-1);
  border-bottom: 1px solid rgba(72, 98, 138, 0.45);
}

.fields {
  padding: 10px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 5px;
}

.field > span {
  color: var(--pa-text-2);
  font-size: 12px;
  display: inline-flex;
  gap: 8px;
}

.field > span i {
  color: var(--pa-warning);
  font-style: normal;
  font-size: 11px;
}

.input {
  border: 1px solid var(--pa-border-strong);
  border-radius: 8px;
  background: rgba(13, 24, 45, 0.9);
  color: var(--pa-text-1);
  min-height: 34px;
  padding: 0 9px;
}

.check {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pa-text-1);
}

.actions {
  position: sticky;
  bottom: 0;
  display: inline-flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--pa-border);
  background: rgba(6, 12, 24, 0.9);
}

.btn {
  border: 1px solid var(--pa-border-strong);
  border-radius: 8px;
  min-height: 34px;
  padding: 0 14px;
  color: var(--pa-text-1);
  background: rgba(22, 36, 66, 0.75);
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg, #2a5ec4, #2f73df);
  border-color: #3c7bf1;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .core-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .core-grid,
  .fields {
    grid-template-columns: 1fr;
  }
}
</style>
