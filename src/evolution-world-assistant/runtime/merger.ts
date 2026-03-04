import { MergeInput, MergedPlan, Prioritized } from './types';
import { ControllerModel } from './contracts';

function comparePriority(lhs: { priority: number; flow_order: number }, rhs: { priority: number; flow_order: number }): number {
  if (lhs.priority !== rhs.priority) {
    return rhs.priority - lhs.priority;
  }
  return lhs.flow_order - rhs.flow_order;
}

function shouldReplace<T>(current: Prioritized<T> | undefined, next: Prioritized<T>): boolean {
  if (!current) {
    return true;
  }
  if (next.priority > current.priority) {
    return true;
  }
  if (next.priority < current.priority) {
    return false;
  }
  return next.flow_order >= current.flow_order;
}

export function mergeFlowResults(results: MergeInput): MergedPlan {
  const sorted = [...results].sort((lhs, rhs) =>
    comparePriority(
      { priority: lhs.flow.priority, flow_order: lhs.flow_order },
      { priority: rhs.flow.priority, flow_order: rhs.flow_order },
    ),
  );

  const upsertMap = new Map<string, Prioritized<{ content: string; enabled: boolean }>>();
  const deleteMap = new Map<string, Prioritized<null>>();
  const toggleMap = new Map<string, Prioritized<{ enabled: boolean }>>();

  let controllerModel: Prioritized<ControllerModel> | undefined;
  const replyParts: string[] = [];
  const diagnostics: Record<string, any> = {};

  for (const result of sorted) {
    const priority = result.flow.priority;
    const flowOrder = result.flow_order;
    const worldbookOps = result.response.operations.worldbook;

    for (const upsert of worldbookOps.upsert_entries) {
      const next: Prioritized<{ content: string; enabled: boolean }> = {
        value: { content: upsert.content, enabled: upsert.enabled },
        priority,
        flow_order: flowOrder,
      };
      const current = upsertMap.get(upsert.name);
      if (shouldReplace(current, next)) {
        upsertMap.set(upsert.name, next);
      }
    }

    for (const deletion of worldbookOps.delete_entries) {
      const next: Prioritized<null> = { value: null, priority, flow_order: flowOrder };
      const current = deleteMap.get(deletion.name);
      if (shouldReplace(current, next)) {
        deleteMap.set(deletion.name, next);
      }
    }

    for (const toggle of worldbookOps.toggle_entries) {
      const next: Prioritized<{ enabled: boolean }> = {
        value: { enabled: toggle.enabled },
        priority,
        flow_order: flowOrder,
      };
      const current = toggleMap.get(toggle.name);
      if (shouldReplace(current, next)) {
        toggleMap.set(toggle.name, next);
      }
    }

    if (result.response.operations.controller_model) {
      const next: Prioritized<ControllerModel> = {
        value: result.response.operations.controller_model,
        priority,
        flow_order: flowOrder,
      };
      if (shouldReplace(controllerModel, next)) {
        controllerModel = next;
      }
    }

    if (result.response.reply_instruction.trim()) {
      replyParts.push(`[Flow:${result.flow.id}]\n${result.response.reply_instruction.trim()}`);
    }

    diagnostics[result.flow.id] = result.response.diagnostics;
  }

  for (const [name, deletion] of deleteMap.entries()) {
    const upsert = upsertMap.get(name);
    if (!upsert) {
      continue;
    }

    if (deletion.priority > upsert.priority || deletion.priority === upsert.priority) {
      upsertMap.delete(name);
      continue;
    }

    deleteMap.delete(name);
  }

  if (!controllerModel) {
    throw new Error('merged result missing controller_model');
  }

  return {
    worldbook: {
      upsert_entries: [...upsertMap.entries()].map(([name, value]) => ({
        name,
        content: value.value.content,
        enabled: value.value.enabled,
      })),
      delete_entries: [...deleteMap.keys()].map(name => ({ name })),
      toggle_entries: [...toggleMap.entries()].map(([name, value]) => ({
        name,
        enabled: value.value.enabled,
      })),
    },
    controller_model: controllerModel.value,
    reply_instruction: replyParts.join('\n\n'),
    diagnostics,
  };
}
