import { buildFlowRequest } from './context-builder';
import { FlowResponseSchema } from './contracts';
import { parseJsonObject } from './helpers';
import { DispatchFlowAttempt, DispatchFlowResult, EwFlowConfig, EwSettings } from './types';

type DispatchInput = {
  settings: EwSettings;
  flows: EwFlowConfig[];
  message_id: number;
  user_input: string;
  request_id: string;
};

export type DispatchFlowsOutput = {
  results: DispatchFlowResult[];
  attempts: DispatchFlowAttempt[];
};

export class DispatchFlowsError extends Error {
  attempts: DispatchFlowAttempt[];

  constructor(message: string, attempts: DispatchFlowAttempt[]) {
    super(message);
    this.name = 'DispatchFlowsError';
    this.attempts = attempts;
  }
}

function applyTemplate(base: Record<string, any>, templateText: string): Record<string, any> {
  if (!templateText.trim()) {
    return base;
  }

  const replaced = templateText.replace(/\{\{\s*([a-zA-Z0-9_.$]+)\s*\}\}/g, (_match, path) => {
    const value = _.get(base, path);
    if (_.isPlainObject(value) || Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return value === undefined ? '' : String(value);
  });

  let templateObject: Record<string, any>;
  try {
    const parsed = JSON.parse(replaced);
    if (!_.isPlainObject(parsed)) {
      throw new Error('request_template must parse to JSON object');
    }
    templateObject = parsed as Record<string, any>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`flow request_template invalid: ${message}`);
  }

  return _.merge({}, base, templateObject);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function executeFlow(
  settings: EwSettings,
  flow: EwFlowConfig,
  flowOrder: number,
  messageId: number,
  userInput: string,
  requestId: string,
  serialResults: Record<string, any>[],
): Promise<DispatchFlowAttempt> {
  const startedAt = Date.now();
  const request = await buildFlowRequest({
    settings,
    flow,
    message_id: messageId,
    user_input: userInput,
    request_id: requestId,
    serial_results: serialResults,
  });

  try {
    if (!flow.api_url.trim()) {
      throw new Error(`[${flow.id}] api_url is empty`);
    }

    const body = applyTemplate(request as unknown as Record<string, any>, flow.request_template);
    const headers = {
      'Content-Type': 'application/json',
      ...parseJsonObject(flow.headers_json),
    };

    if (flow.api_key.trim()) {
      headers.Authorization = `Bearer ${flow.api_key.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), flow.timeout_ms);

    try {
      const response = await fetch(flow.api_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`[${flow.id}] HTTP ${response.status}`);
      }

      const json = await response.json();
      const parsed = FlowResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          `[${flow.id}] response schema invalid: ${parsed.error.issues
            .map(issue => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')}`,
        );
      }

      return {
        flow,
        flow_order: flowOrder,
        request,
        response: parsed.data,
        ok: true,
        elapsed_ms: Date.now() - startedAt,
      };
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      if (aborted) {
        throw new Error(`[${flow.id}] timeout (${flow.timeout_ms}ms)`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      flow,
      flow_order: flowOrder,
      request,
      ok: false,
      error: toErrorMessage(error),
      elapsed_ms: Date.now() - startedAt,
    };
  }
}

export async function dispatchFlows(input: DispatchInput): Promise<DispatchFlowsOutput> {
  const flows = input.flows.filter(flow => flow.enabled);
  if (flows.length === 0) {
    throw new Error('no enabled flows');
  }

  if (input.settings.dispatch_mode === 'serial') {
    const serialResults: Record<string, any>[] = [];
    const attempts: DispatchFlowAttempt[] = [];
    const outputs: DispatchFlowResult[] = [];

    for (const [index, flow] of flows.entries()) {
      const attempt = await executeFlow(
        input.settings,
        flow,
        index,
        input.message_id,
        input.user_input,
        input.request_id,
        serialResults,
      );
      attempts.push(attempt);

      if (!attempt.ok || !attempt.response) {
        throw new DispatchFlowsError(attempt.error ?? `[${flow.id}] failed`, attempts);
      }

      const output: DispatchFlowResult = {
        flow: attempt.flow,
        flow_order: attempt.flow_order,
        response: attempt.response,
      };
      outputs.push(output);
      serialResults.push({
        flow_id: output.response.flow_id,
        priority: output.response.priority,
        reply_instruction: output.response.reply_instruction,
        operations: output.response.operations,
        diagnostics: output.response.diagnostics,
      });
    }

    return { results: outputs, attempts };
  }

  const attempts = await Promise.all(
    flows.map((flow, index) =>
      executeFlow(input.settings, flow, index, input.message_id, input.user_input, input.request_id, []),
    ),
  );

  const failed = attempts.find(attempt => !attempt.ok);
  if (failed) {
    throw new DispatchFlowsError(failed.error ?? `[${failed.flow.id}] failed`, attempts);
  }

  return {
    results: attempts
      .filter((attempt): attempt is DispatchFlowAttempt & { response: NonNullable<DispatchFlowAttempt['response']> } => {
        return attempt.ok && Boolean(attempt.response);
      })
      .map(attempt => ({
        flow: attempt.flow,
        flow_order: attempt.flow_order,
        response: attempt.response,
      })),
    attempts,
  };
}
