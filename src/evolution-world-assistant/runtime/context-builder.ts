import { FlowRequestV1, FlowRequestSchema } from './contracts';
import { EwFlowConfig, EwSettings } from './types';
import { uuidv4 } from './helpers';
import { resolveTargetWorldbook } from './worldbook-runtime';

export type BuildRequestInput = {
  settings: EwSettings;
  flow: EwFlowConfig;
  message_id: number;
  request_id?: string;
  serial_results?: Record<string, any>[];
};


export async function buildFlowRequest(input: BuildRequestInput): Promise<FlowRequestV1> {
  const chatId = String(
    (typeof SillyTavern !== 'undefined' ? SillyTavern?.getCurrentChatId?.() ?? (SillyTavern as any).chatId : null) ?? 'unknown',
  );
  const requestId = input.request_id ?? uuidv4();

  // Resolve the target worldbook name (needed for write operations).
  let worldbookName = '';
  try {
    const target = await resolveTargetWorldbook(input.settings);
    worldbookName = target.worldbook_name;
  } catch (e) {
    console.debug('[Evolution World] worldbook resolution failed in buildFlowRequest:', e);
  }

  const payload = FlowRequestSchema.parse({
    version: 'ew-flow/v1',
    request_id: requestId,
    chat_id: chatId,
    message_id: input.message_id,
    flow: {
      id: input.flow.id,
      name: input.flow.name,
      priority: input.flow.priority,
      timeout_ms: input.flow.timeout_ms,
      generation_options: input.flow.generation_options,
      behavior_options: input.flow.behavior_options,
    },
    context: {
      turns: input.flow.context_turns,
      extract_rules: input.flow.extract_rules,
      exclude_rules: input.flow.exclude_rules,
    },
    worldbook: {
      worldbook_name: worldbookName,
    },
    serial_results: input.serial_results ?? [],
  });

  return payload;
}
