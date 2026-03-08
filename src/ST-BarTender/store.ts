// ============================================================
// Pinia Store — 所有运行时状态的唯一数据源，提供树状 UI 状态与行为绑定
// ============================================================

import {
  SettingsSchema,
  WidgetConfigSchema,
  PresetEntrySnapshotSchema,
  uid,
  type WidgetConfig,
  type ChatMessage,
  type PresetEntrySnapshot,
  type Settings,
  type ActionBinding,
} from './schema';
import { callAI } from './ai';

export const useStore = defineStore('preset-control', () => {
  // ========== 持久化设置（存入酒馆脚本变量）==========
  const settings = ref<Settings>(
    SettingsSchema.parse(getVariables({ type: 'script', script_id: getScriptId() })),
  );

  // Fix #6: 用 debounce 代替 watchEffect 避免持久化风暴
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  watch(
    settings,
    () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        insertOrAssignVariables(klona(settings.value), { type: 'script', script_id: getScriptId() });
      }, 500);
    },
    { deep: true },
  );

  // ========== 面板配置 ==========
  const widgetConfig = ref<WidgetConfig>(
    settings.value.widget_config ?? WidgetConfigSchema.parse({
      title: '控制中心',
      root: { id: uid(), type: 'container', layout: { direction: 'column', gap: 'medium', padding: 'medium' } }
    }),
  );

  watch(
    widgetConfig,
    config => {
      settings.value.widget_config = klona(config);
    },
    { deep: true },
  );

  // ========== 对话历史 ==========
  const chatHistory = ref<ChatMessage[]>(settings.value.chat_history ?? []);

  watch(
    chatHistory,
    history => {
      settings.value.chat_history = klona(history);
    },
    { deep: true },
  );

  // ========== 预设条目快照 ==========
  const presetEntries = ref<PresetEntrySnapshot[]>([]);

  // Fix #2: 预设参数的响应式缓存
  const presetParams = ref<Record<string, number>>({});

  /** 扫描当前预设，提取所有条目信息和运行参数 */
  function scanPreset() {
    try {
      const preset = getPreset('in_use');
      presetEntries.value = preset.prompts.map(p =>
        PresetEntrySnapshotSchema.parse({
          id: p.id,
          name: p.name,
          enabled: p.enabled,
          role: p.role,
          position_type: p.position?.type ?? 'relative',
        }),
      );
      // 同步参数缓存
      refreshParamsCache(preset);
    } catch (err) {
      console.error('[预设控制] 扫描预设失败:', err);
      toastr.error('扫描预设失败，请检查是否有正在使用的预设');
    }
  }

  function refreshParamsCache(preset?: Preset) {
    try {
      const p = preset ?? getPreset('in_use');
      const s = p.settings;
      presetParams.value = {
        temperature: s.temperature,
        max_context: s.max_context,
        max_completion_tokens: s.max_completion_tokens,
        frequency_penalty: s.frequency_penalty,
        presence_penalty: s.presence_penalty,
        top_p: s.top_p,
        min_p: s.min_p,
        top_k: s.top_k,
        repetition_penalty: s.repetition_penalty,
      };
    } catch {
      // 静默失败
    }
  }

  // ========== AI 加载状态 ==========
  const isLoading = ref(false);

  // ========== 面板显示 ==========
  const panelOpen = ref(settings.value.panel_open);

  watch(panelOpen, open => {
    settings.value.panel_open = open;
  });

  // ========== Actions ==========

  async function sendChat(userMessage: string) {
    chatHistory.value.push({
      id: uid(), // Fix #7: 唯一 ID
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    isLoading.value = true;
    try {
      scanPreset();

      const result = await callAI(userMessage, presetEntries.value, presetParams.value, settings.value.api);

      chatHistory.value.push({
        id: uid(),
        role: 'assistant',
        content: `✅ 成功生成新面板「${result.title}」`,
        timestamp: Date.now(),
      });

      widgetConfig.value = result;
      toastr.success('面板已更新');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      chatHistory.value.push({
        id: uid(),
        role: 'assistant',
        content: `⚠️ 生成失败: ${errorMsg}`,
        timestamp: Date.now(),
      });
      toastr.error(`AI 生成失败: ${errorMsg}`);
    } finally {
      isLoading.value = false;
    }
  }

  // ========== Abstract UI Engine API ==========

  /**
   * Fix #2: 引擎获取绑定状态值（全部走响应式缓存）
   */
  function getBoundValue(action?: ActionBinding): any {
    if (!action || action.type === 'none') return null;

    if (action.type === 'toggle_preset_entry') {
      const entry = presetEntries.value.find(e => e.id === action.entry_id);
      return entry ? entry.enabled : false;
    }

    if (action.type === 'set_preset_param') {
      return presetParams.value[action.param_name] ?? 0;
    }

    return null;
  }

  /**
   * 引擎派发修改
   */
  async function executeAction(action?: ActionBinding, payload?: any) {
    if (!action || action.type === 'none') return;

    if (action.type === 'toggle_preset_entry') {
      const state = Boolean(payload);
      try {
        await updatePresetWith('in_use', preset => {
          const prompt = preset.prompts.find(p => p.id === action.entry_id);
          if (prompt) {
            prompt.enabled = state;
          }
          return preset;
        });
        scanPreset();
      } catch (err) {
        toastr.error('同步条目到预设失败');
      }
      return;
    }

    if (action.type === 'set_preset_param') {
      try {
        // 先更新本地缓存保证 UI 即时响应
        presetParams.value[action.param_name] = payload;

        await updatePresetWith('in_use', preset => {
          if (action.param_name in preset.settings) {
            (preset.settings as any)[action.param_name] = payload;
          }
          return preset;
        });
      } catch (err) {
        toastr.error('设置预设参数失败');
        refreshParamsCache(); // 回滚缓存
      }
      return;
    }
  }

  /** 无 AI 也能自动生成基础界面 */
  function autoGenerateFromPreset() {
    scanPreset();

    const normalEntries = presetEntries.value.filter(
      e =>
        !['worldInfoBefore', 'worldInfoAfter', 'personaDescription', 'charDescription',
          'charPersonality', 'scenario', 'dialogueExamples', 'chatHistory'].includes(e.id),
    );

    widgetConfig.value = WidgetConfigSchema.parse({
      title: '默认条目控制',
      root: {
        id: uid(),
        type: 'container',
        layout: { direction: 'column', gap: 'medium', padding: 'medium' },
        children: [
          {
            id: uid(),
            type: 'card',
            appearance: { theme: 'glass', corner: 'rounded' },
            layout: { direction: 'column', gap: 'small', padding: 'medium' },
            children: normalEntries.map(e => ({
              id: uid(),
              type: 'toggle',
              label: e.name,
              action: { type: 'toggle_preset_entry', entry_id: e.id }
            }))
          }
        ]
      }
    });
  }

  function refreshFromPreset() {
    scanPreset();
  }

  function clearChat() {
    chatHistory.value = [];
  }

  return {
    settings,
    widgetConfig,
    chatHistory,
    presetEntries,
    presetParams,
    isLoading,
    panelOpen,
    scanPreset,
    sendChat,
    getBoundValue,
    executeAction,
    autoGenerateFromPreset,
    refreshFromPreset,
    clearChat,
  };
});
