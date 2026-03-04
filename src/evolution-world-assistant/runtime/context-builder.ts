import { FlowRequestV1, FlowRequestSchema, TextSliceRule } from './contracts';
import { EwFlowConfig, EwSettings } from './types';
import { extractSlices, removeSlices, uuidv4 } from './helpers';
import { buildRuntimeWorldbookName, ensureRuntimeWorldbook } from './worldbook-runtime';

export type BuildRequestInput = {
  settings: EwSettings;
  flow: EwFlowConfig;
  message_id: number;
  user_input: string;
  request_id?: string;
  serial_results?: Record<string, any>[];
};

function applyContentFilters(text: string, extractRules: TextSliceRule[], excludeRules: TextSliceRule[]): string {
  let content = text;
  if (extractRules.length > 0) {
    content = extractSlices(content, extractRules);
  }
  if (excludeRules.length > 0) {
    content = removeSlices(content, excludeRules);
  }
  return content;
}

function getMvuSnapshot(messageId: number): { message_id: number; stat_data: Record<string, any> } {
  const mvu = _.get(window, 'Mvu');
  if (!mvu || !_.isFunction(mvu.getMvuData)) {
    return { message_id: messageId, stat_data: {} };
  }

  try {
    const data = mvu.getMvuData({ type: 'message', message_id: -1 });
    return {
      message_id: -1,
      stat_data: _.get(data, 'stat_data', {}),
    };
  } catch {
    return { message_id: messageId, stat_data: {} };
  }
}

async function getRuntimeWorldbookSnapshot(settings: EwSettings): Promise<{ runtime_name: string; entries: Array<{ name: string; enabled: boolean; content: string }> }> {
  try {
    const runtime = await ensureRuntimeWorldbook(settings, false);
    return {
      runtime_name: runtime.worldbook_name,
      entries: runtime.entries.map(entry => ({
        name: entry.name,
        enabled: entry.enabled,
        content: entry.content,
      })),
    };
  } catch {
    const chatId = String(SillyTavern.getCurrentChatId?.() ?? SillyTavern.chatId ?? 'unknown');
    return {
      runtime_name: buildRuntimeWorldbookName(settings, chatId),
      entries: [],
    };
  }
}

function getContextMessages(flow: EwFlowConfig): Array<{ role: 'system' | 'assistant' | 'user'; content: string; message_id: number }> {
  const lastId = getLastMessageId();
  if (lastId < 0) {
    return [];
  }

  const messages = getChatMessages(`0-${lastId}`, { hide_state: 'unhidden' })
    .slice(-flow.context_turns)
    .map(msg => ({
      role: msg.role,
      content: applyContentFilters(msg.message ?? '', flow.extract_rules, flow.exclude_rules),
      message_id: msg.message_id,
    }))
    .filter(msg => Boolean(msg.content.trim()));

  return messages;
}

export async function buildFlowRequest(input: BuildRequestInput): Promise<FlowRequestV1> {
  const chatId = String(SillyTavern.getCurrentChatId?.() ?? SillyTavern.chatId ?? 'unknown');
  const requestId = input.request_id ?? uuidv4();

  const worldbook = await getRuntimeWorldbookSnapshot(input.settings);
  const contextMessages = getContextMessages(input.flow);

  const payload = FlowRequestSchema.parse({
    version: 'ew-flow/v1',
    request_id: requestId,
    chat_id: chatId,
    message_id: input.message_id,
    user_input: input.user_input,
    flow: {
      id: input.flow.id,
      name: input.flow.name,
      priority: input.flow.priority,
      timeout_ms: input.flow.timeout_ms,
    },
    context: {
      messages: contextMessages,
      turns: input.flow.context_turns,
      extract_rules: input.flow.extract_rules,
      exclude_rules: input.flow.exclude_rules,
    },
    worldbook,
    mvu: getMvuSnapshot(input.message_id),
    serial_results: input.serial_results ?? [],
  });

  return payload;
}
