<template>
  <section class="ew-panel" :data-busy="store.busy ? '1' : '0'">
    <header class="ew-header">
      <div>
        <h2>Evolution World Assistant</h2>
        <p>阻塞式动态世界链路（聊天级单书）</p>
      </div>
      <div class="ew-actions-inline">
        <button type="button" @click="store.validateConfig">校验配置</button>
        <button type="button" @click="store.exportConfig">导出配置</button>
      </div>
    </header>

    <div class="ew-grid two">
      <label>
        <span>总开关</span>
        <input v-model="store.settings.enabled" type="checkbox" />
      </label>
      <label>
        <span>调度模式</span>
        <select v-model="store.settings.dispatch_mode">
          <option value="parallel">并行</option>
          <option value="serial">串行</option>
        </select>
      </label>
      <label>
        <span>总超时(ms)</span>
        <input v-model.number="store.settings.total_timeout_ms" type="number" min="1000" step="500" />
      </label>
      <label>
        <span>门控TTL(ms)</span>
        <input v-model.number="store.settings.gate_ttl_ms" type="number" min="1000" step="500" />
      </label>
      <label>
        <span>失败策略</span>
        <input :value="'失败即中止发送'" type="text" disabled />
      </label>
      <label>
        <span>运行时世界书前缀</span>
        <input v-model="store.settings.runtime_worldbook_prefix" type="text" />
      </label>
      <label>
        <span>命名策略</span>
        <input :value="'自动发现优先（当前绑定 -> 前缀扫描 -> 新建）'" type="text" disabled />
      </label>
      <label>
        <span>动态条目前缀</span>
        <input v-model="store.settings.dynamic_entry_prefix" type="text" />
      </label>
      <label>
        <span>控制器条目名</span>
        <input v-model="store.settings.controller_entry_name" type="text" />
      </label>
      <label>
        <span>元数据条目名</span>
        <input v-model="store.settings.meta_entry_name" type="text" />
      </label>
    </div>

    <div class="ew-divider" />

    <header class="ew-sub-header">
      <h3>流配置</h3>
      <button type="button" @click="store.addFlow">新增流</button>
    </header>

    <article v-for="(flow, index) in store.settings.flows" :key="flow.id" class="flow-card">
      <header class="flow-head">
        <strong>{{ flow.name || `Flow ${index + 1}` }}</strong>
        <div class="ew-actions-inline">
          <label class="inline-check">
            <input v-model="flow.enabled" type="checkbox" />
            启用
          </label>
          <button type="button" class="danger" @click="store.removeFlow(flow.id)">删除</button>
        </div>
      </header>

      <div class="ew-grid two">
        <label>
          <span>名称</span>
          <input v-model="flow.name" type="text" />
        </label>
        <label>
          <span>流ID</span>
          <input v-model="flow.id" type="text" />
        </label>
        <label>
          <span>API URL</span>
          <input v-model="flow.api_url" type="text" placeholder="https://example.com/flow" />
        </label>
        <label>
          <span>API Key</span>
          <input v-model="flow.api_key" type="password" />
        </label>
        <label>
          <span>优先级</span>
          <input v-model.number="flow.priority" type="number" step="1" />
        </label>
        <label>
          <span>超时(ms)</span>
          <input v-model.number="flow.timeout_ms" type="number" min="1000" step="500" />
        </label>
        <label>
          <span>上下文楼层数</span>
          <input v-model.number="flow.context_turns" type="number" min="1" step="1" />
        </label>
        <label>
          <span>额外请求头(JSON对象)</span>
          <textarea v-model="flow.headers_json" rows="3" placeholder='{"X-Token":"value"}' />
        </label>
      </div>

      <div class="ew-grid two">
        <section class="rule-box">
          <header>
            <strong>提取规则</strong>
            <button type="button" @click="addRule(flow.extract_rules)">新增</button>
          </header>
          <div v-for="(rule, ridx) in flow.extract_rules" :key="`e-${ridx}`" class="rule-row">
            <input v-model="rule.start" type="text" placeholder="start" />
            <input v-model="rule.end" type="text" placeholder="end" />
            <button type="button" class="danger" @click="removeRule(flow.extract_rules, ridx)">删</button>
          </div>
        </section>

        <section class="rule-box">
          <header>
            <strong>排除规则</strong>
            <button type="button" @click="addRule(flow.exclude_rules)">新增</button>
          </header>
          <div v-for="(rule, ridx) in flow.exclude_rules" :key="`x-${ridx}`" class="rule-row">
            <input v-model="rule.start" type="text" placeholder="start" />
            <input v-model="rule.end" type="text" placeholder="end" />
            <button type="button" class="danger" @click="removeRule(flow.exclude_rules, ridx)">删</button>
          </div>
        </section>
      </div>

      <label>
        <span>request_template(JSON merge)</span>
        <textarea
          v-model="flow.request_template"
          rows="4"
          placeholder='{"context":{"turns":{{context.turns}}}}'
        />
      </label>
    </article>

    <div class="ew-divider" />

    <header class="ew-sub-header">
      <h3>调试</h3>
      <div class="ew-actions-inline">
        <button type="button" @click="store.runManual(manualMessage)">手动运行</button>
        <button type="button" @click="store.validateControllerSyntax">控制器语法校验</button>
        <button type="button" @click="store.rollbackController">回滚控制器</button>
      </div>
    </header>

    <label>
      <span>手动运行输入（留空默认取最新楼层）</span>
      <textarea v-model="manualMessage" rows="3" placeholder="manual user input" />
    </label>

    <div class="run-box">
      <strong>最近运行</strong>
      <pre>{{ formattedLastRun }}</pre>
    </div>

    <div class="run-box">
      <strong>最近请求/响应摘要</strong>
      <pre>{{ formattedLastIo }}</pre>
    </div>

    <label>
      <span>导入配置(JSON)</span>
      <textarea v-model="store.importText" rows="6" placeholder="paste config json" />
    </label>
    <div class="ew-actions-inline">
      <button type="button" @click="store.importConfig">导入配置</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useEwStore } from './store';

const store = useEwStore();
const manualMessage = ref('');

const formattedLastRun = computed(() => JSON.stringify(store.lastRun ?? {}, null, 2));
const formattedLastIo = computed(() => JSON.stringify(store.lastIo ?? {}, null, 2));

function addRule(target: Array<{ start: string; end: string }>) {
  target.push({ start: '', end: '' });
}

function removeRule(target: Array<{ start: string; end: string }>, index: number) {
  target.splice(index, 1);
}

onMounted(() => {
  store.setOpen(true);
});

onUnmounted(() => {
  store.setOpen(false);
});
</script>

<style scoped>
.ew-panel {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  background: color-mix(in srgb, var(--SmartThemeBodyColor) 90%, #111);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ew-panel[data-busy='1'] {
  opacity: 0.85;
}

.ew-header,
.ew-sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ew-header h2,
.ew-sub-header h3 {
  margin: 0;
}

.ew-header p {
  margin: 2px 0 0;
  opacity: 0.8;
  font-size: 12px;
}

.ew-grid {
  display: grid;
  gap: 8px;
}

.ew-grid.two {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.flow-card {
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-box {
  border: 1px dashed var(--SmartThemeBorderColor);
  border-radius: 6px;
  padding: 6px;
}

.rule-box > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.rule-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  margin-bottom: 6px;
}

.ew-divider {
  height: 1px;
  background: var(--SmartThemeBorderColor);
}

.ew-actions-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.inline-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

input,
select,
textarea,
button {
  font-size: 12px;
}

textarea {
  resize: vertical;
}

button.danger {
  color: #ffd4d4;
  border-color: #a04545;
}

.run-box {
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 6px;
  padding: 8px;
}

pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 180px;
  overflow: auto;
  font-size: 12px;
}
</style>
