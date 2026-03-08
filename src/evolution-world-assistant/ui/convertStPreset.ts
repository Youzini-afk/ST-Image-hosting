/**
 * SillyTavern 预设 → EwFlowConfig 转换器
 *
 * 自动检测两种 ST 预设变体：
 *  1. 标准格式 — 顶层 temperature + prompts[]
 *  2. 扩展包装 — extensions.SPreset 内嵌正则等
 *
 * 转换为 EwFlowConfig 原始对象（由调用方通过 EwFlowConfigSchema.parse 做最终校验）。
 */

import type { EwFlowConfig, EwPromptOrderEntry } from '../runtime/types';
import { BUILTIN_MARKERS, DEFAULT_PROMPT_ORDER } from '../runtime/types';

// ── ST 预设检测 ──────────────────────────────────────────────

const ST_TOP_LEVEL_KEYS = new Set([
  'temperature', 'top_p', 'frequency_penalty', 'presence_penalty',
  'openai_max_context', 'openai_max_tokens', 'prompts',
]);

/**
 * 判断一个已解析的 JSON 对象是否像 SillyTavern 预设。
 * 判定条件：存在 `prompts` 数组 且 至少命中 2 个其它已知 ST 顶层字段。
 */
export function isSillyTavernPreset(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const rec = obj as Record<string, unknown>;

  // 标准格式
  if (Array.isArray(rec.prompts)) {
    let hits = 0;
    for (const key of ST_TOP_LEVEL_KEYS) {
      if (key in rec) hits++;
    }
    return hits >= 3; // prompts + 至少 2 个生成参数
  }

  // 扩展包装格式 (Izumi 样式) — 暂不支持，因为没有 prompts 顶层
  return false;
}

// ── 内部辅助 ─────────────────────────────────────────────────

/** ST injection_position (number) → EwPromptOrderEntry injection_position */
function mapInjPos(v: unknown): 'relative' | 'in_chat' {
  return v === 1 ? 'in_chat' : 'relative';
}

/** 生成随机 ID */
function uid(): string {
  return crypto.randomUUID?.() ?? `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── 核心转换 ─────────────────────────────────────────────────

/**
 * 将 SillyTavern 预设 JSON 转换为 EwFlowConfig（未校验）。
 * @param preset  已解析的 ST 预设对象
 * @param name    用作 flow 名称（通常是文件名去掉 .json）
 */
export function convertStPresetToFlow(
  preset: Record<string, unknown>,
  name: string,
): EwFlowConfig {
  // ── 1. 生成参数 ──
  const genOpts: Record<string, unknown> = {};

  if (typeof preset.temperature === 'number') genOpts.temperature = preset.temperature;
  if (typeof preset.top_p === 'number') genOpts.top_p = preset.top_p;
  if (typeof preset.frequency_penalty === 'number') genOpts.frequency_penalty = preset.frequency_penalty;
  if (typeof preset.presence_penalty === 'number') genOpts.presence_penalty = preset.presence_penalty;
  if (typeof preset.openai_max_context === 'number') genOpts.max_context_tokens = preset.openai_max_context;
  if (typeof preset.openai_max_tokens === 'number') genOpts.max_reply_tokens = preset.openai_max_tokens;
  if (typeof preset.stream_openai === 'boolean') genOpts.stream = preset.stream_openai;
  if (typeof preset.max_context_unlocked === 'boolean') genOpts.unlock_context_length = preset.max_context_unlocked;

  // ── 2. prompt_order 构建 ──
  const stPrompts = preset.prompts as Array<Record<string, unknown>> | undefined;
  let promptOrder: EwPromptOrderEntry[];

  if (Array.isArray(stPrompts) && stPrompts.length > 0) {
    promptOrder = stPrompts.map((p) => {
      const identifier = (typeof p.identifier === 'string' && p.identifier) || uid();
      const isMarker = p.marker === true;

      // ST 中 marker 条目的 enabled 由 system_prompt 暗示；
      // 非 marker 条目使用 enabled (若存在) 否则默认 true
      let enabled: boolean;
      if (isMarker) {
        // 内置 marker 总是 enabled
        enabled = BUILTIN_MARKERS.has(identifier) ? true : (p.enabled !== false);
      } else {
        enabled = p.enabled !== false;
      }

      return {
        identifier,
        name: typeof p.name === 'string' ? p.name : identifier,
        enabled,
        type: isMarker ? 'marker' : 'prompt',
        role: (['system', 'user', 'assistant'].includes(p.role as string) ? p.role : 'system') as 'system' | 'user' | 'assistant',
        content: typeof p.content === 'string' ? p.content : '',
        injection_position: mapInjPos(p.injection_position),
        injection_depth: typeof p.injection_depth === 'number' ? p.injection_depth : 0,
      } satisfies EwPromptOrderEntry;
    });
  } else {
    promptOrder = [...DEFAULT_PROMPT_ORDER];
  }

  // ── 3. 正则规则（扩展包装格式） ──
  const customRegex: Array<{ id: string; name: string; enabled: boolean; find_regex: string; replace_string: string }> = [];
  const extensions = preset.extensions;
  if (extensions && typeof extensions === 'object' && !Array.isArray(extensions)) {
    const sp = (extensions as Record<string, unknown>).SPreset;
    if (sp && typeof sp === 'object' && !Array.isArray(sp)) {
      const rb = (sp as Record<string, unknown>).RegexBinding;
      if (rb && typeof rb === 'object' && !Array.isArray(rb) && Array.isArray((rb as Record<string, unknown>).regexes)) {
        for (const r of (rb as Record<string, unknown>).regexes as Array<Record<string, unknown>>) {
          customRegex.push({
            id: (typeof r.id === 'string' && r.id) || uid(),
            name: typeof r.scriptName === 'string' ? r.scriptName : '',
            enabled: r.disabled !== true,
            find_regex: typeof r.findRegex === 'string' ? r.findRegex : '',
            replace_string: typeof r.replaceString === 'string' ? r.replaceString : '',
          });
        }
      }
    }
  }

  // ── 4. 组装 ──
  return {
    id: uid(),
    name: name || 'ST Preset',
    enabled: true,
    priority: 100,
    timeout_ms: 8000,
    api_preset_id: '',
    generation_options: genOpts,
    behavior_options: {},
    prompt_order: promptOrder,
    prompt_items: [],
    api_url: '',
    api_key: '',
    context_turns: 8,
    extract_rules: [],
    exclude_rules: [],
    use_tavern_regex: false,
    custom_regex_rules: customRegex,
    request_template: '',
    headers_json: '',
  } as unknown as EwFlowConfig;
}
