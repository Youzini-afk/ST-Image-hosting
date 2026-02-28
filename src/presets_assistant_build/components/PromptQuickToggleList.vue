<template>
  <section class="prompt-panel">
    <header class="panel-head">
      <div class="title-wrap">
        <h3>Prompt 列表</h3>
        <p>浏览态支持搜索、开关、排序、批量，修改自动保存</p>
      </div>
      <div class="stats">
        <span>{{ items.length }} 条</span>
        <span v-if="lastSavedAt > 0" class="saved-at">已保存</span>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <input
          class="input"
          type="text"
          :value="query"
          placeholder="搜索 name / id / role"
          @input="emit('update-query', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="select-all">
        <input
          type="checkbox"
          :checked="allVisibleSelected"
          :disabled="disabled || items.length < 1"
          @change="emit('select-visible', ($event.target as HTMLInputElement).checked)"
        />
        <span>全选可见</span>
      </label>
      <button
        class="btn mini"
        type="button"
        :disabled="disabled || selectedCount < 1 || saving"
        @click="emitBatch(true)"
      >
        批量启用
      </button>
      <button
        class="btn mini"
        type="button"
        :disabled="disabled || selectedCount < 1 || saving"
        @click="emitBatch(false)"
      >
        批量禁用
      </button>
      <button
        class="btn mini ghost"
        type="button"
        :disabled="disabled || selectedCount < 1"
        @click="emit('clear-selection')"
      >
        清空选择
      </button>
    </div>

    <div class="list">
      <article
        v-for="item in items"
        :key="item.key"
        class="row"
        :data-kind="item.kind"
        draggable="true"
        @dragstart="onDragStart(item.index)"
        @dragover.prevent
        @drop="onDrop(item.index)"
        @dragend="draggingIndex = null"
      >
        <div class="row-left">
          <label class="pick">
            <input
              type="checkbox"
              :checked="item.selected"
              :disabled="disabled || saving"
              @change="emit('select', item.index, ($event.target as HTMLInputElement).checked)"
            />
          </label>
          <div class="meta">
            <strong>{{ item.name || item.id }}</strong>
            <small>{{ item.id }} · {{ item.role }}</small>
          </div>
        </div>

        <div class="row-right">
          <span v-if="item.is_saving || saving" class="state saving">保存中</span>
          <span v-else-if="item.is_recently_saved" class="state saved">已保存</span>
          <div class="sort-buttons">
            <button class="sort-btn" type="button" :disabled="disabled || saving" @click="emitMove(item.index, -1)">
              ↑
            </button>
            <button class="sort-btn" type="button" :disabled="disabled || saving" @click="emitMove(item.index, 1)">
              ↓
            </button>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="item.enabled"
              :disabled="disabled || item.is_saving || saving"
              @change="emit('toggle', item.index, ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </div>
      </article>
      <div v-if="items.length < 1" class="empty">没有匹配的 Prompt</div>
    </div>

    <footer class="footer">
      <span>已选 {{ selectedCount }} / {{ visibleIndices.length }}</span>
      <span v-if="saving" class="saving">自动保存队列处理中...</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import type { PromptQuickItem } from '../types';

const props = defineProps<{
  items: PromptQuickItem[];
  query: string;
  selectedCount: number;
  selectedIndices: number[];
  visibleIndices: number[];
  allVisibleSelected: boolean;
  saving: boolean;
  lastSavedAt: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update-query': [query: string];
  toggle: [index: number, enabled: boolean];
  select: [index: number, checked: boolean];
  'select-visible': [checked: boolean];
  'clear-selection': [];
  reorder: [fromIndex: number, toIndex: number];
  'batch-set-enabled': [indices: number[], enabled: boolean];
}>();

const draggingIndex = ref<number | null>(null);

function emitMove(index: number, direction: -1 | 1): void {
  emit('reorder', index, index + direction);
}

function onDragStart(index: number): void {
  draggingIndex.value = index;
}

function onDrop(targetIndex: number): void {
  if (draggingIndex.value === null || draggingIndex.value === targetIndex) {
    draggingIndex.value = null;
    return;
  }
  emit('reorder', draggingIndex.value, targetIndex);
  draggingIndex.value = null;
}

function emitBatch(enabled: boolean): void {
  emit('batch-set-enabled', props.selectedIndices, enabled);
}
</script>

<style scoped>
.prompt-panel {
  border: 1px solid var(--pa-border-strong);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(8, 15, 30, 0.94), rgba(6, 11, 23, 0.94));
  display: grid;
  grid-template-rows: auto auto minmax(180px, 1fr) auto;
  min-height: 0;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  padding: 12px 14px;
  border-bottom: 1px solid var(--pa-border);
}

.title-wrap h3 {
  margin: 0;
  font-size: 15px;
  color: var(--pa-text-1);
}

.title-wrap p {
  margin: 4px 0 0;
  color: var(--pa-text-3);
  font-size: 12px;
}

.stats {
  display: grid;
  gap: 4px;
  justify-items: end;
  color: var(--pa-text-2);
  font-size: 12px;
}

.saved-at {
  color: var(--pa-success);
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto auto auto;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--pa-border);
}

.search {
  min-width: 0;
}

.input {
  width: 100%;
  min-height: 34px;
  border: 1px solid var(--pa-border-strong);
  border-radius: 9px;
  background: rgba(12, 22, 42, 0.9);
  color: var(--pa-text-1);
  padding: 0 10px;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--pa-text-2);
  font-size: 12px;
}

.btn {
  border: 1px solid var(--pa-border-strong);
  border-radius: 8px;
  background: rgba(34, 54, 89, 0.7);
  color: var(--pa-text-1);
  cursor: pointer;
}

.btn.mini {
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
}

.btn.ghost {
  background: rgba(10, 18, 34, 0.7);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.list {
  overflow: auto;
  min-height: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid rgba(64, 89, 128, 0.35);
}

.row[data-kind='system'] {
  background: rgba(42, 93, 189, 0.12);
}

.row[data-kind='placeholder'] {
  background: rgba(13, 148, 136, 0.12);
}

.row-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pick {
  display: inline-flex;
}

.meta {
  display: grid;
  gap: 2px;
}

.meta strong {
  color: var(--pa-text-1);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 46vw;
}

.meta small {
  color: var(--pa-text-3);
  font-size: 11px;
}

.row-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.state {
  font-size: 11px;
  min-width: 40px;
  text-align: right;
}

.state.saving {
  color: var(--pa-warning);
}

.state.saved {
  color: var(--pa-success);
}

.sort-buttons {
  display: inline-flex;
  gap: 4px;
}

.sort-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--pa-border-strong);
  border-radius: 6px;
  background: rgba(11, 20, 37, 0.8);
  color: var(--pa-text-2);
  cursor: pointer;
  line-height: 1;
}

.sort-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.switch {
  position: relative;
  width: 44px;
  height: 24px;
  display: inline-block;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(88, 108, 140, 0.6);
  transition: 0.18s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #f8fbff;
  transition: 0.18s;
}

input:checked + .slider {
  background: #2f6fdf;
}

input:checked + .slider::before {
  transform: translateX(20px);
}

.empty {
  padding: 18px;
  color: var(--pa-text-3);
  text-align: center;
}

.footer {
  border-top: 1px solid var(--pa-border);
  min-height: 34px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--pa-text-3);
  font-size: 12px;
}

.footer .saving {
  color: var(--pa-warning);
}

@media (max-width: 1024px) {
  .toolbar {
    grid-template-columns: 1fr 1fr;
  }

  .meta strong {
    max-width: 36vw;
  }
}
</style>
