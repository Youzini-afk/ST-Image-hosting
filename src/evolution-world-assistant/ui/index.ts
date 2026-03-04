import { createScriptIdDiv, teleportStyle } from '@util/script';
import App from './App.vue';
import { patchSettings } from '../runtime/settings';

let app: ReturnType<typeof createApp> | null = null;
let destroyStyle: (() => void) | null = null;
let $root: JQuery<HTMLDivElement> | null = null;
let menuRetryTimer: ReturnType<typeof setTimeout> | null = null;

const MENU_ITEM_NAME = 'Evolution 世界助手';
const MENU_CONTAINER_ID = 'evolution-world-assistant-menu-container';
const MENU_ITEM_ID = 'evolution-world-assistant-menu-item';
const MENU_EVENT_NS = '.evolution_world_assistant';
const MENU_RETRY_MS = 1500;

function resolveParentDocument(): Document {
  const runtime = globalThis as Record<string, any>;
  const chatDocument = runtime.SillyTavern?.Chat?.document;
  if (chatDocument && typeof chatDocument.querySelector === 'function') {
    return chatDocument as Document;
  }

  try {
    return (window.parent && window.parent !== window ? window.parent : window).document;
  } catch {
    return document;
  }
}

function clearMenuRetryTimer() {
  if (!menuRetryTimer) {
    return;
  }
  clearTimeout(menuRetryTimer);
  menuRetryTimer = null;
}

function scheduleMenuRetry() {
  if (menuRetryTimer) {
    return;
  }

  menuRetryTimer = setTimeout(() => {
    menuRetryTimer = null;
    installMagicWandMenuItem();
  }, MENU_RETRY_MS);
}

async function onMenuItemClick(parentDoc: Document, $extensionsMenu: JQuery<HTMLElement>) {
  const $menuButton = $('#extensionsMenuButton', parentDoc);
  if ($menuButton.length && $extensionsMenu.is(':visible')) {
    $menuButton.trigger('click');
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  patchSettings({ ui_open: true });
}

function installMagicWandMenuItem() {
  const parentDoc = resolveParentDocument();
  const $extensionsMenu = $('#extensionsMenu', parentDoc);
  if (!$extensionsMenu.length) {
    scheduleMenuRetry();
    return;
  }

  clearMenuRetryTimer();

  let $menuContainer = $(`#${MENU_CONTAINER_ID}`, $extensionsMenu);
  if (!$menuContainer.length) {
    $menuContainer = $(
      `<div class="extension_container interactable" id="${MENU_CONTAINER_ID}" tabindex="0"></div>`,
    );
    $extensionsMenu.append($menuContainer);
  }

  let $menuItem = $(`#${MENU_ITEM_ID}`, $menuContainer);
  if (!$menuItem.length) {
    $menuItem = $(
      `<div class="list-group-item flex-container flexGap5 interactable" id="${MENU_ITEM_ID}" title="打开 Evolution World Assistant"><div class="fa-fw fa-solid fa-book-open extensionsMenuExtensionButton"></div><span>${MENU_ITEM_NAME}</span></div>`,
    );
    $menuContainer.append($menuItem);
  }

  $menuItem
    .off(`click${MENU_EVENT_NS}`)
    .on(`click${MENU_EVENT_NS}`, event => {
      event.stopPropagation();
      void onMenuItemClick(parentDoc, $extensionsMenu);
    });
}

function uninstallMagicWandMenuItem() {
  clearMenuRetryTimer();
  const parentDoc = resolveParentDocument();
  const $menuContainer = $(`#${MENU_CONTAINER_ID}`, parentDoc);
  $menuContainer.find(`#${MENU_ITEM_ID}`).off(`click${MENU_EVENT_NS}`);
  $menuContainer.remove();
}

export function mountUi() {
  if (app) {
    return;
  }

  app = createApp(App).use(createPinia());
  $root = createScriptIdDiv().appendTo('body');
  app.mount($root[0]);

  const style = teleportStyle();
  destroyStyle = style.destroy;

  try {
    installMagicWandMenuItem();
  } catch (error) {
    console.error('[Evolution World] magic-wand menu setup failed:', error);
    toastr.error(`魔法棒菜单挂载失败: ${error instanceof Error ? error.message : String(error)}`, 'Evolution World');
  }
}

export function unmountUi() {
  uninstallMagicWandMenuItem();

  app?.unmount();
  app = null;
  $root?.remove();
  $root = null;
  destroyStyle?.();
  destroyStyle = null;
}
