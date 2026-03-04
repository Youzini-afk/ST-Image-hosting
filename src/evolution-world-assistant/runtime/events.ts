import { getSettings } from './settings';
import {
  getRuntimeState,
  clearSendContext,
  recordGeneration,
  recordUserSend,
  recordUserSendIntent,
  resetRuntimeState,
  setProcessing,
  shouldHandleGenerationAfter,
} from './state';
import { runWorkflow } from './pipeline';

const listenerStops: EventOnReturn[] = [];
const domCleanup: Array<() => void> = [];

function getSendTextareaValue(): string {
  const textarea = document.getElementById('send_textarea') as HTMLTextAreaElement | null;
  return String(textarea?.value ?? '');
}

function installSendIntentHooks() {
  for (const cleanup of domCleanup.splice(0, domCleanup.length)) {
    cleanup();
  }

  const sendButton = document.getElementById('send_but');
  if (sendButton) {
    const onSendIntent = () => {
      recordUserSendIntent(getSendTextareaValue());
    };
    sendButton.addEventListener('click', onSendIntent, true);
    sendButton.addEventListener('pointerup', onSendIntent, true);
    sendButton.addEventListener('touchend', onSendIntent, true);
    domCleanup.push(() => {
      sendButton.removeEventListener('click', onSendIntent, true);
      sendButton.removeEventListener('pointerup', onSendIntent, true);
      sendButton.removeEventListener('touchend', onSendIntent, true);
    });
  }

  const sendTextarea = document.getElementById('send_textarea');
  if (sendTextarea) {
    const onKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if ((keyboardEvent.key === 'Enter' || keyboardEvent.key === 'NumpadEnter') && !keyboardEvent.shiftKey) {
        recordUserSendIntent(getSendTextareaValue());
      }
    };
    sendTextarea.addEventListener('keydown', onKeyDown, true);
    domCleanup.push(() => sendTextarea.removeEventListener('keydown', onKeyDown, true));
  }
}

function stopGenerationNow() {
  try {
    SillyTavern.stopGeneration?.();
  } catch {
    // ignore
  }

  try {
    stopAllGeneration();
  } catch {
    // ignore
  }
}

async function onGenerationAfterCommands(
  type: string,
  params: {
    automatic_trigger?: boolean;
    quiet_prompt?: string;
    [key: string]: any;
  },
  dryRun: boolean,
) {
  const settings = getSettings();
  const decision = shouldHandleGenerationAfter(type, params, dryRun, settings);
  if (!decision.ok) {
    return;
  }

  const messageId = getRuntimeState().last_send?.message_id ?? getLastMessageId();
  const userInput = getRuntimeState().last_send?.user_input ?? getRuntimeState().last_send_intent?.user_input ?? '';
  if (!userInput.trim()) {
    return;
  }
  clearSendContext();

  setProcessing(true);
  try {
    const result = await runWorkflow({
      message_id: messageId,
      user_input: userInput,
      mode: 'auto',
      inject_reply: true,
    });

    if (!result.ok) {
      stopGenerationNow();
      toastr.error(`动态世界流程失败，本轮已中止: ${result.reason ?? 'unknown error'}`, 'Evolution World');
      return;
    }
  } finally {
    setProcessing(false);
  }
}

export function initRuntimeEvents() {
  installSendIntentHooks();

  listenerStops.push(
    eventOn(tavern_events.MESSAGE_SENT, messageId => {
      const msg = getChatMessages(messageId)[0];
      if (!msg || msg.role !== 'user') {
        return;
      }

      recordUserSend(messageId, msg.message ?? '');
    }),
  );

  listenerStops.push(
    eventOn(tavern_events.GENERATION_STARTED, (type, params, dryRun) => {
      recordGeneration(type, params ?? {}, dryRun);
    }),
  );

  listenerStops.push(
    eventMakeFirst(tavern_events.GENERATION_AFTER_COMMANDS, async (type, params, dryRun) => {
      await onGenerationAfterCommands(type, params ?? {}, dryRun);
    }),
  );

  listenerStops.push(
    eventOn(tavern_events.CHAT_CHANGED, () => {
      resetRuntimeState();
      setTimeout(() => {
        installSendIntentHooks();
      }, 300);
    }),
  );
}

export function disposeRuntimeEvents() {
  for (const stopper of listenerStops.splice(0, listenerStops.length)) {
    stopper.stop();
  }
  for (const cleanup of domCleanup.splice(0, domCleanup.length)) {
    cleanup();
  }
}
