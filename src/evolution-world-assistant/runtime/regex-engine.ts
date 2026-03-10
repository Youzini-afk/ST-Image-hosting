/**
 * 酒馆正则处理引擎
 *
 * 收集预设、全局、角色卡三个来源的正则脚本，
 * 按 placement 过滤后对聊天消息执行查找替换。
 */

// ── 正则脚本数据结构 ──────────────────────────────────────────
interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings: string[];
  /** 0 = user input, 1 = AI output, 2 = slash cmd, 3 = world info */
  placement: number[];
  disabled: boolean;
  markdownOnly: boolean;
  promptOnly: boolean;
  runOnEdit: boolean;
  substituteRegex: number | boolean;
  minDepth: number | null;
  maxDepth: number | null;
}

// ── 收集所有正则脚本 ──────────────────────────────────────────

/**
 * 从三个来源收集正则脚本：全局、预设绑定、角色卡局部。
 * 返回合并后的脚本数组（去重依据 id）。
 */
export function collectAllRegexScripts(): RegexScript[] {
  const scriptsById = new Map<string, RegexScript>();
  const win = globalThis as any;

  // 来源 1：全局正则（ST 正则扩展存储在 extension_settings.regex 中）
  try {
    const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern : undefined;
    const extSettings = ctx?.extensionSettings ?? win.extension_settings;
    const globalScripts: any[] = extSettings?.regex ?? [];
    for (const s of globalScripts) {
      if (s && s.id && !s.disabled) {
        scriptsById.set(s.id, normalizeScript(s));
      }
    }
  } catch { /* 全局正则不可用，跳过 */ }

  // 来源 2：预设绑定正则（当前预设 JSON 的 extensions.regex_scripts）
  try {
    const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern : undefined;
    const oaiSettings = ctx?.chatCompletionSettings ?? win.oai_settings;
    const presetScripts: any[] = oaiSettings?.regex_scripts ?? [];
    for (const s of presetScripts) {
      if (s && s.id && !s.disabled) {
        scriptsById.set(s.id, normalizeScript(s));
      }
    }
  } catch { /* 预设正则不可用，跳过 */ }

  // 来源 3：角色卡局部正则（character.data.extensions.regex_scripts）
  try {
    const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern : undefined;
    const charId = ctx?.characterId;
    const characters = ctx?.characters;
    if (charId !== undefined && characters) {
      const char = characters[Number(charId)];
      const charScripts: any[] = char?.data?.extensions?.regex_scripts ?? [];
      for (const s of charScripts) {
        if (s && s.id && !s.disabled) {
          scriptsById.set(s.id, normalizeScript(s));
        }
      }
    }
  } catch { /* 角色卡正则不可用，跳过 */ }

  return [...scriptsById.values()];
}

/** 将来源不同的脚本数据统一为 RegexScript 结构 */
function normalizeScript(raw: any): RegexScript {
  return {
    id: raw.id ?? '',
    scriptName: raw.scriptName ?? '',
    findRegex: raw.findRegex ?? '',
    replaceString: raw.replaceString ?? '',
    trimStrings: Array.isArray(raw.trimStrings) ? raw.trimStrings : [],
    placement: Array.isArray(raw.placement) ? raw.placement : [],
    disabled: Boolean(raw.disabled),
    markdownOnly: Boolean(raw.markdownOnly),
    promptOnly: Boolean(raw.promptOnly),
    runOnEdit: Boolean(raw.runOnEdit),
    substituteRegex: raw.substituteRegex ?? 0,
    minDepth: raw.minDepth ?? null,
    maxDepth: raw.maxDepth ?? null,
  };
}

// ── 美化正则检测 ──────────────────────────────────────────────

/**
 * 检测 replaceString 是否为美化/渲染用途。
 * 包含 HTML 标签、style/class 属性或 CSS 相关内容时判定为美化正则。
 */
const HTML_TAG_PATTERN = /<\/?(?:div|span|p|br|hr|img|details|summary|section|article|aside|header|footer|nav|ul|ol|li|table|tr|td|th|h[1-6]|a|em|strong|blockquote|pre|code|svg|path)\b/i;
const HTML_ATTR_PATTERN = /\b(?:style|class|id|href|src|data-)\s*=/i;

export function isBeautificationReplace(replaceString: string): boolean {
  if (!replaceString) return false;
  return HTML_TAG_PATTERN.test(replaceString) || HTML_ATTR_PATTERN.test(replaceString);
}

// ── 执行正则替换 ──────────────────────────────────────────────

/**
 * 对单条消息内容执行一组正则脚本。
 *
 * @param content   消息文本
 * @param scripts   要执行的脚本数组
 * @param role      消息角色，决定使用 placement 0(user) 还是 1(assistant)
 * @returns 处理后的文本
 */
function applyRegexScripts(
  content: string,
  scripts: RegexScript[],
  role: 'user' | 'assistant' | 'system',
): string {
  // role → placement 映射
  // placement 0 = user input, 1 = AI output
  // system 消息暂按 AI output 处理（与 ST 行为一致）
  const targetPlacement = role === 'user' ? 0 : 1;

  let result = content;
  for (const script of scripts) {
    // 跳过禁用脚本
    if (script.disabled) continue;
    // 只保留 markdownOnly=false 的脚本（prompt 场景不是 markdown 渲染）
    if (script.markdownOnly) continue;
    // 检查 placement 是否匹配
    if (!script.placement.includes(targetPlacement)) continue;
    // 空正则跳过
    if (!script.findRegex) continue;

    try {
      const regex = parseRegexFromString(script.findRegex);
      if (!regex) continue;

      // 美化正则检测：replaceString 包含 HTML 标签 → 说明是用于渲染的美化正则，
      // 在 prompt 场景中我们要的是干净正文，所以将其替换为空字符串（仅本地处理，不改酒馆原始正则）
      let effectiveReplace = script.replaceString;
      if (isBeautificationReplace(effectiveReplace)) {
        console.debug(`[EW Regex] 检测到美化正则 "${script.scriptName}"，替换为空以获取干净正文`);
        effectiveReplace = '';
      }

      result = result.replace(regex, effectiveReplace);

      // 执行 trimStrings
      for (const trim of script.trimStrings) {
        if (trim) {
          result = result.split(trim).join('');
        }
      }
    } catch (e) {
      console.warn(`[EW Regex] 脚本 "${script.scriptName}" 执行失败:`, e);
    }
  }
  return result;
}

/**
 * 将 ST 格式的正则字符串解析为 RegExp 对象。
 * ST 格式："/pattern/flags" 或纯字符串。
 */
function parseRegexFromString(regexStr: string): RegExp | null {
  if (!regexStr) return null;
  // 尝试解析 /pattern/flags 格式
  const match = regexStr.match(/^\/(.+)\/([gimsuy]*)$/s);
  if (match) {
    return new RegExp(match[1], match[2]);
  }
  // 纯字符串 → 当字面量使用
  return new RegExp(regexStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
}

// ── 公开接口 ──────────────────────────────────────────────────

/**
 * 对一组聊天消息应用酒馆的正则处理。
 * 收集全局 + 预设 + 角色卡的正则脚本，跳过 markdownOnly 脚本，
 * 按 placement 匹配消息角色后执行查找替换。
 *
 * @param messages  聊天消息数组（会被原地修改）
 */
export function applyTavernRegex(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; name?: string }>,
): void {
  const scripts = collectAllRegexScripts();
  if (!scripts.length) {
    console.debug('[EW Regex] 没有可用的正则脚本');
    return;
  }

  console.debug(`[EW Regex] 收集到 ${scripts.length} 条正则脚本，开始处理 ${messages.length} 条消息`);

  for (const msg of messages) {
    const original = msg.content;
    msg.content = applyRegexScripts(msg.content, scripts, msg.role);
    if (msg.content !== original) {
      console.debug(`[EW Regex] 消息已处理 (role=${msg.role}, name=${msg.name ?? 'N/A'})`);
    }
  }
}
