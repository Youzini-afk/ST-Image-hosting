import { renderEjsContent } from './ejs-bridge';
import { collectLatestSnapshotFast } from './floor-binding';
import { applyTavernRegex } from './regex-engine';
import type { EwFlowConfig, EwPromptOrderEntry } from './types';

// SillyTavern 运行时全局变量，在扩展上下文中可用
declare function getCharacterCardFields():
  | {
      description: string;
      personality: string;
      persona: string;
      scenario: string;
      mesExamples: string;
      system: string;
      jailbreak: string;
    }
  | undefined;
declare function getLastMessageId(): number;
declare function getChatMessages(range: string, opts?: Record<string, any>): any[];
declare function getCharData(name: 'current' | string): SillyTavern.v1CharData | null;
declare const SillyTavern: { getContext(): Record<string, any> } | undefined;
declare const characters: SillyTavern.v1CharData[] | undefined;
declare const this_chid: number | string | undefined;
declare const power_user: Record<string, any> | undefined;

function getHostRuntime(): Record<string, any> {
  try {
    if (window.parent && window.parent !== window) {
      return window.parent as unknown as Record<string, any>;
    }
  } catch {
    // ignore cross-frame access failures and fall back to current window
  }

  return globalThis as Record<string, any>;
}

function getRuntimeContext(): Record<string, any> | undefined {
  const hostRuntime = getHostRuntime();

  if (typeof hostRuntime.SillyTavern?.getContext === 'function') {
    return hostRuntime.SillyTavern.getContext();
  }
  if (typeof SillyTavern?.getContext === 'function') {
    return SillyTavern.getContext();
  }

  return undefined;
}

function getRuntimeCharacterCardFields(): ReturnType<typeof getCharacterCardFields> {
  const hostRuntime = getHostRuntime();
  if (typeof hostRuntime.getCharacterCardFields === 'function') {
    const chid = getRuntimeCharacterId();
    if (Number.isFinite(chid) && chid >= 0) {
      return hostRuntime.getCharacterCardFields({ chid });
    }

    return hostRuntime.getCharacterCardFields();
  }

  return getCharacterCardFields?.();
}

function getRuntimeCharacterId(): number {
  const hostRuntime = getHostRuntime();
  const ctx = getRuntimeContext();

  const candidates = [
    ctx?.characterId,
    hostRuntime.SillyTavern?.characterId,
    hostRuntime.this_chid,
    (globalThis as any).this_chid,
    this_chid,
  ];

  for (const value of candidates) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) {
      return numberValue;
    }
  }

  return -1;
}

function getRuntimeCharacters(): SillyTavern.v1CharData[] {
  const hostRuntime = getHostRuntime();
  const ctx = getRuntimeContext();
  const candidates = [
    hostRuntime.SillyTavern?.characters,
    (SillyTavern as any)?.characters,
    ctx?.characters,
    hostRuntime.characters,
    (globalThis as any).characters,
    characters,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate as SillyTavern.v1CharData[];
    }
  }

  return [];
}

function getRuntimeCharData(): SillyTavern.v1CharData | null {
  const hostRuntime = getHostRuntime();
  const ctx = getRuntimeContext();
  const characterId = getRuntimeCharacterId();
  const runtimeCharacters = getRuntimeCharacters();

  if (Number.isFinite(characterId) && characterId >= 0 && runtimeCharacters[characterId]) {
    return runtimeCharacters[characterId] as SillyTavern.v1CharData;
  }

  if (Number.isFinite(Number(ctx?.characterId)) && Number(ctx?.characterId) >= 0 && Array.isArray(ctx?.characters)) {
    return (ctx.characters[Number(ctx.characterId)] as SillyTavern.v1CharData) ?? null;
  }

  if (typeof hostRuntime.getCharData === 'function') {
    return hostRuntime.getCharData('current') ?? null;
  }

  return getCharData?.('current') ?? null;
}

function getRuntimeLastMessageId(): number {
  const hostRuntime = getHostRuntime();
  if (typeof hostRuntime.getLastMessageId === 'function') {
    return Number(hostRuntime.getLastMessageId());
  }

  return getLastMessageId();
}

function getRuntimeChatMessages(range: string, opts?: Record<string, any>): any[] {
  const hostRuntime = getHostRuntime();
  if (typeof hostRuntime.getChatMessages === 'function') {
    return hostRuntime.getChatMessages(range, opts);
  }

  return getChatMessages(range, opts);
}

function getPreferredText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

function getRuntimePersonaDescription(): string {
  const hostRuntime = getHostRuntime();
  const ctx = getRuntimeContext();

  return getPreferredText(
    ctx?.powerUserSettings?.persona_description,
    ctx?.persona_description,
    hostRuntime.power_user?.persona_description,
    hostRuntime.SillyTavern?.powerUserSettings?.persona_description,
    (globalThis as any).power_user?.persona_description,
    power_user?.persona_description,
    getRuntimeCharacterCardFields()?.persona,
  );
}

function getRuntimeCharacterFields(): {
  main: string;
  jailbreak: string;
  charDescription: string;
  charPersonality: string;
  scenario: string;
  personaDescription: string;
  dialogueExamples: string;
} {
  const helperFields = getRuntimeCharacterCardFields();
  const charData = getRuntimeCharData();
  const ctx = getRuntimeContext();

  const charDescription = getPreferredText(
    helperFields?.description,
    charData?.description,
    charData?.data?.description,
    ctx?.name2_description,
  );

  const charPersonality = getPreferredText(
    helperFields?.personality,
    charData?.personality,
    charData?.data?.personality,
    ctx?.name2_personality,
  );

  const scenario = getPreferredText(helperFields?.scenario, charData?.scenario, charData?.data?.scenario);
  const dialogueExamples = getPreferredText(
    helperFields?.mesExamples,
    charData?.mes_example,
    charData?.data?.mes_example,
  );
  const main = getPreferredText(helperFields?.system, charData?.data?.system_prompt);
  const jailbreak = getPreferredText(helperFields?.jailbreak, charData?.data?.post_history_instructions);

  return {
    main,
    jailbreak,
    charDescription,
    charPersonality,
    scenario,
    personaDescription: getRuntimePersonaDescription(),
    dialogueExamples,
  };
}

async function populateWorldInfoComponents(components: PromptComponents): Promise<void> {
  try {
    const ctx = getRuntimeContext();
    const hostRuntime = getHostRuntime();

    const cachedBefore = getPreferredText(ctx?.worldInfoBefore);
    const cachedAfter = getPreferredText(ctx?.worldInfoAfter);

    if (typeof hostRuntime.SillyTavern?.getWorldInfoPrompt === 'function') {
      const chat = components.chatMessages.map(msg => msg.content).filter(Boolean);
      const maxContext = Number(ctx?.maxContext ?? hostRuntime.SillyTavern?.maxContext ?? 0);
      const result = await hostRuntime.SillyTavern.getWorldInfoPrompt(chat, maxContext, true);

      components.worldInfoBefore = getPreferredText(result?.worldInfoBefore, result?.worldInfoString, cachedBefore);
      components.worldInfoAfter = getPreferredText(result?.worldInfoAfter, cachedAfter);
      return;
    }

    components.worldInfoBefore = cachedBefore;
    components.worldInfoAfter = cachedAfter;
  } catch (e) {
    console.debug('[Evolution World] world info prompt read failed:', e);
  }
}

/**
 * Raw prompt components collected from SillyTavern's runtime environment.
 * Marker-type entries in prompt_order will source their content from here.
 */
export type PromptComponents = {
  main: string;
  jailbreak: string;
  charDescription: string;
  charPersonality: string;
  scenario: string;
  personaDescription: string;
  worldInfoBefore: string;
  worldInfoAfter: string;
  dialogueExamples: string;
  chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; name?: string }>;
  /** Extension prompts that need depth-based injection into chat history (ST position=IN_CHAT) */
  depthInjections: Array<{ content: string; depth: number; role: 'system' | 'user' | 'assistant' }>;
  /** Extension prompts that go before all other prompts (ST position=BEFORE_PROMPT) */
  beforePromptInjections: string[];
};

export type PromptPreviewMessage = AssembledMessage & {
  debugOnly?: boolean;
  previewTitle?: string;
};

type AssemblePreviewOptions = {
  includeMarkerPlaceholders?: boolean;
};

/**
 * Collect all prompt components from SillyTavern's runtime environment.
 *
 * Gathers raw content for every system marker that can appear in a flow's
 * prompt_order: character card fields, world info, jailbreak, and chat messages.
 */
export async function collectPromptComponents(flow: EwFlowConfig): Promise<PromptComponents> {
  const components: PromptComponents = {
    main: '',
    jailbreak: '',
    charDescription: '',
    charPersonality: '',
    scenario: '',
    personaDescription: '',
    worldInfoBefore: '',
    worldInfoAfter: '',
    dialogueExamples: '',
    chatMessages: [],
    depthInjections: [],
    beforePromptInjections: [],
  };

  // ── 1. Character card fields ──────────────────────────────────────────
  try {
    const fields = getRuntimeCharacterFields();
    components.charDescription = fields.charDescription;
    components.charPersonality = fields.charPersonality;
    components.scenario = fields.scenario;
    components.personaDescription = fields.personaDescription;
    components.dialogueExamples = fields.dialogueExamples;
    components.main = fields.main;
    components.jailbreak = fields.jailbreak;
  } catch (e) {
    console.debug('[Evolution World] getCharacterCardFields failed:', e);
  }

  // ── 2. Chat messages ──────────────────────────────────────────────────
  try {
    const lastId = getRuntimeLastMessageId();
    if (lastId >= 0) {
      const msgs = getRuntimeChatMessages(`0-${lastId}`, { hide_state: 'unhidden' });
      components.chatMessages = msgs
        .slice(-flow.context_turns)
        .map((msg: any) => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.message ?? '',
          name: msg.name,
        }))
        .filter((msg: any) => Boolean(msg.content.trim()));
    }
  } catch (e) {
    console.debug('[Evolution World] getChatMessages failed:', e);
  }

  // ── 3. World Info (before/after) ───────────────────────────────────────
  await populateWorldInfoComponents(components);

  // ── 4. Extension prompts (depth injections, before-prompt, etc.) ────────
  // SillyTavern stores computed extension prompts in `extension_prompts`.
  // Each entry: { value: string, position: number, depth: number, role: number }
  //   position: IN_PROMPT(0) = in prompt area, IN_CHAT(1) = depth injection,
  //             BEFORE_PROMPT(2) = before all prompts, NONE(-1) = skip
  //   role:     SYSTEM(0), USER(1), ASSISTANT(2)
  try {
    const ctx2 = getRuntimeContext();
    const extPrompts =
      ctx2?.extensionPrompts ?? getHostRuntime().extension_prompts ?? (globalThis as any).extension_prompts;
    if (extPrompts && typeof extPrompts === 'object') {
      const roleMap: Record<number, 'system' | 'user' | 'assistant'> = {
        0: 'system',
        1: 'user',
        2: 'assistant',
      };
      const inPromptEntries: string[] = [];

      for (const [, prompt] of Object.entries(extPrompts)) {
        const p = prompt as any;
        if (!p || typeof p.value !== 'string' || !p.value.trim()) continue;

        const role = roleMap[p.role] ?? 'system';

        switch (p.position) {
          case 0: // IN_PROMPT — in the prompt area (near character definitions)
            inPromptEntries.push(p.value.trim());
            break;
          case 1: // IN_CHAT — depth-based injection into chat history
            components.depthInjections.push({
              content: p.value.trim(),
              depth: typeof p.depth === 'number' ? p.depth : 0,
              role,
            });
            break;
          case 2: // BEFORE_PROMPT — before all other prompts
            components.beforePromptInjections.push(p.value.trim());
            break;
          // NONE (-1) is intentionally ignored
        }
      }

      // IN_PROMPT entries: append to worldInfoBefore as fallback
      // (only if we didn't already get WI from context)
      if (inPromptEntries.length) {
        components.worldInfoBefore = [components.worldInfoBefore, ...inPromptEntries].filter(s => s).join('\n');
      }
    }
  } catch (e) {
    console.debug('[Evolution World] extension_prompts read failed:', e);
  }

  // ── 5. 正则处理 ─────────────────────────────────────────────────────
  // 当 flow 启用 use_tavern_regex 时，对聊天消息应用酒馆的正则脚本
  // （预设 + 全局 + 角色卡局部，跳过 markdownOnly）
  if (flow.use_tavern_regex && components.chatMessages.length > 0) {
    applyTavernRegex(components.chatMessages);
  }

  return components;
}

export type AssembledMessage = { role: 'system' | 'user' | 'assistant'; content: string; name?: string };

function createMarkerPreviewMessage(title: string, content: string): PromptPreviewMessage {
  return {
    role: 'system',
    content,
    debugOnly: true,
    previewTitle: title,
  };
}

async function buildMarkerPreviewMessage(
  entry: EwPromptOrderEntry,
  components: PromptComponents,
): Promise<PromptPreviewMessage> {
  const markerTitle = entry.name?.trim() || entry.identifier;

  if (entry.identifier === 'chatHistory') {
    const count = components.chatMessages.length;
    const summary =
      count > 0
        ? `已读取 ${count} 条聊天消息。触发工作流时，这里会展开为多条 user/assistant 消息。`
        : '当前没有可用的聊天消息，因此这里不会发送任何历史消息。';
    return createMarkerPreviewMessage(`📌 ${markerTitle}`, summary);
  }

  const rawContent = resolveMarkerContent(entry.identifier, components);
  const renderedContent = rawContent.trim() ? await renderEjsContent(rawContent) : '';
  const summary = renderedContent.trim()
    ? `已读取该段内容（${renderedContent.length} chars）。触发工作流时会发送。`
    : '当前为空，因此这里不会发送任何内容。';

  return createMarkerPreviewMessage(`📌 ${markerTitle}`, summary);
}

/**
 * Assemble an ordered array of prompt messages according to a flow's prompt_order.
 *
 * This mirrors SillyTavern's `populateChatCompletion()` logic: it walks
 * through the user-configured prompt order and fills each slot with the
 * appropriate content — either from automatically-collected PromptComponents
 * (for markers) or from user-written content (for prompt entries).
 *
 * Supports injection_position='in_chat' + injection_depth for prompts
 * that should be inserted at a specific depth inside the chat history.
 */
export async function assembleOrderedPrompts(
  promptOrder: EwPromptOrderEntry[],
  components: PromptComponents,
  options: AssemblePreviewOptions = {},
): Promise<PromptPreviewMessage[]> {
  const result: PromptPreviewMessage[] = [];
  // Deferred injections: prompts with in_chat position that go inside chat history
  const deferredInjections: Array<{ content: string; role: 'system' | 'user' | 'assistant'; depth: number }> = [];
  let chatHistoryStartIdx = -1;

  for (const entry of promptOrder) {
    if (!entry.enabled) continue;

    if (options.includeMarkerPlaceholders && entry.type === 'marker') {
      result.push(await buildMarkerPreviewMessage(entry, components));
    }

    // Defer in_chat injections — they'll be inserted after chat history is placed
    if (entry.injection_position === 'in_chat' && entry.identifier !== 'chatHistory') {
      if (entry.type === 'prompt' && entry.content.trim()) {
        const rendered = await renderEjsContent(entry.content);
        deferredInjections.push({ content: rendered, role: entry.role, depth: entry.injection_depth });
      } else if (entry.type === 'marker') {
        const content = await renderEjsContent(resolveMarkerContent(entry.identifier, components));
        if (content.trim()) {
          deferredInjections.push({ content, role: entry.role, depth: entry.injection_depth });
        }
      }
      continue;
    }

    if (entry.type === 'marker') {
      if (entry.identifier === 'chatHistory') {
        // Mark where chat history starts in result
        chatHistoryStartIdx = result.length;
        // Chat history expands into multiple user/assistant messages
        for (const msg of components.chatMessages) {
          if (msg.content.trim()) {
            result.push({ role: msg.role, content: msg.content, name: msg.name });
          }
        }
        continue;
      }

      const content = await renderEjsContent(resolveMarkerContent(entry.identifier, components));
      if (content.trim()) {
        result.push({ role: entry.role, content });
      }
    } else {
      // User-editable prompt — use entry.content, fallback to marker for 'main'
      const raw = entry.content.trim() || (entry.identifier === 'main' ? components.main : '');
      if (raw.trim()) {
        const content = await renderEjsContent(raw);
        result.push({ role: entry.role, content });
      }
    }
  }

  // ── Merge extension depth injections (WI depth, Author's Note, etc.) ──
  for (const inj of components.depthInjections) {
    deferredInjections.push({ content: inj.content, role: inj.role, depth: inj.depth });
  }

  // ── Insert deferred in_chat injections at the correct depth ──
  // depth=0 means at the end of chat history, depth=1 means before the last
  // chat message, depth=N means before the Nth-from-last message, etc.
  if (deferredInjections.length > 0 && chatHistoryStartIdx >= 0) {
    const chatHistoryEndIdx = result.length;
    const chatLen = chatHistoryEndIdx - chatHistoryStartIdx;

    // Sort by depth descending so deeper injections are inserted first
    // (this preserves correct positions when inserting multiple items)
    // 按 depth 升序排列，从最浅到最深
    deferredInjections.sort((a, b) => a.depth - b.depth);
    // 从后往前插入：每次插入不影响之前已计算的位置
    for (let i = deferredInjections.length - 1; i >= 0; i--) {
      const { role, content, depth } = deferredInjections[i];
      const insertIdx = Math.max(chatHistoryStartIdx, chatHistoryEndIdx - Math.min(depth, chatLen));
      result.splice(insertIdx, 0, { role, content });
    }
  } else if (deferredInjections.length > 0) {
    // No chat history marker — append deferred items at the end
    for (const { role, content } of deferredInjections) {
      result.push({ role, content });
    }
  }

  // ── Prepend BEFORE_PROMPT extension injections ──
  for (let i = components.beforePromptInjections.length - 1; i >= 0; i--) {
    result.unshift({ role: 'system', content: components.beforePromptInjections[i] });
  }

  return result;
}

/**
 * Resolve the content for a marker-type prompt order entry.
 */
function resolveMarkerContent(identifier: string, components: PromptComponents): string {
  switch (identifier) {
    case 'main':
      return components.main;
    case 'enhanceDefinitions':
      return components.main; // CR-1: ST treats this as an extension of main
    case 'charDescription':
      return components.charDescription;
    case 'charPersonality':
      return components.charPersonality;
    case 'scenario':
      return components.scenario;
    case 'personaDescription':
      return components.personaDescription;
    case 'worldInfoBefore':
      return components.worldInfoBefore;
    case 'worldInfoAfter':
      return components.worldInfoAfter;
    case 'dialogueExamples':
      return components.dialogueExamples;
    case 'postHistoryInstructions':
      return components.jailbreak;
    default:
      return '';
  }
}

// ── Entry Name Injection ─────────────────────────────────────

/**
 * Inject EW entry names into assembled prompt messages via content matching.
 *
 * Uses the latest snapshot data (Controller + Dyn entries) to find their
 * content in the assembled messages and prepend `[entry_name]` labels.
 * This lets the AI identify which EW worldbook entry each content block
 * belongs to.
 *
 * @param messages  The assembled prompt messages (mutated in place)
 * @param controllerEntryName  The name of the Controller entry (from settings)
 */
export async function injectEntryNames(messages: AssembledMessage[], controllerEntryName: string): Promise<void> {
  const { controller, dyn } = await collectLatestSnapshotFast();

  // Build a list of { name, content } to match, sorted by content length descending
  // (longer content first to avoid partial substring matches).
  const matchTargets: Array<{ name: string; content: string }> = [];

  if (controller && controller.trim()) {
    matchTargets.push({ name: controllerEntryName, content: controller });
  }

  for (const snap of dyn.values()) {
    if (snap.content && snap.content.trim()) {
      matchTargets.push({ name: snap.name, content: snap.content });
    }
  }

  // Sort longest first for greedy matching.
  matchTargets.sort((a, b) => b.content.length - a.content.length);

  if (matchTargets.length === 0) return;

  // Scan each message and prepend entry names where content matches.
  for (const msg of messages) {
    for (const target of matchTargets) {
      if (msg.content.includes(target.content)) {
        msg.content = msg.content.replace(target.content, `[${target.name}]\n${target.content}`);
      }
    }
  }
}

// ── Prompt Preview (Debug) ───────────────────────────────────

/**
 * Build and return the full prompt messages array for debug preview.
 *
 * Runs the same pipeline as the real dispatch (collect components →
 * assemble ordered prompts → inject entry names) but does NOT send
 * anything to the AI. Returns the messages array for UI display.
 */
export async function previewPrompt(flow: EwFlowConfig, controllerEntryName: string): Promise<PromptPreviewMessage[]> {
  const components = await collectPromptComponents(flow);
  const messages = await assembleOrderedPrompts(flow.prompt_order, components, { includeMarkerPlaceholders: true });
  await injectEntryNames(messages, controllerEntryName);
  return messages;
}
