// ============================================================
// 预设控制脚本入口
// ============================================================

import { createScriptIdDiv, teleportStyle } from '@util/script';
import Panel from './Panel.vue';
import { useStore } from './store';

const MENU_ITEM_NAME = '预设控制';
const MENU_CONTAINER_ID = 'st-bartender-menu-container';
const MENU_ITEM_ID = 'st-bartender-menu-item';
const MENU_EVENT_NS = '.st_bartender';
const MENU_RETRY_MS = 1500;

let app: ReturnType<typeof createApp> | null = null;
let $root: JQuery<HTMLDivElement> | null = null;
let destroyStyle: (() => void) | null = null;
let menuRetryTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================
// 1. 魔法棒菜单项注入（与 Evolution World 相同模式）
// ============================================================

function resolveParentDocument(): Document {
  try {
    return (window.parent && window.parent !== window ? window.parent : window).document;
  } catch {
    return document;
  }
}

function clearMenuRetryTimer() {
  if (!menuRetryTimer) return;
  clearTimeout(menuRetryTimer);
  menuRetryTimer = null;
}

function scheduleMenuRetry() {
  if (menuRetryTimer) return;
  menuRetryTimer = setTimeout(() => {
    menuRetryTimer = null;
    installMagicWandMenuItem();
  }, MENU_RETRY_MS);
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
      `<div class="list-group-item flex-container flexGap5 interactable" id="${MENU_ITEM_ID}" title="打开预设控制面板"><div class="fa-fw fa-solid fa-sliders extensionsMenuExtensionButton"></div><span>${MENU_ITEM_NAME}</span></div>`,
    );
    $menuContainer.append($menuItem);
  }

  $menuItem
    .off(`click${MENU_EVENT_NS}`)
    .on(`click${MENU_EVENT_NS}`, event => {
      event.stopPropagation();
      const $menuButton = $('#extensionsMenuButton', parentDoc);
      if ($menuButton.length && $extensionsMenu.is(':visible')) {
        $menuButton.trigger('click');
      }
      togglePanel();
    });
}

function uninstallMagicWandMenuItem() {
  clearMenuRetryTimer();
  const parentDoc = resolveParentDocument();
  const $menuContainer = $(`#${MENU_CONTAINER_ID}`, parentDoc);
  $menuContainer.find(`#${MENU_ITEM_ID}`).off(`click${MENU_EVENT_NS}`);
  $menuContainer.remove();
}

// ============================================================
// 2. 面板（与 Evolution World 相同模式：div + teleportStyle）
// ============================================================

function togglePanel() {
  if ($root) {
    $root.toggle();
    return;
  }
  mountPanel();
}

function mountPanel() {
  if (app) return;

  app = createApp(Panel).use(createPinia());
  $root = createScriptIdDiv().appendTo('body');
  app.mount($root[0]);

  const style = teleportStyle();
  destroyStyle = style.destroy;

  const pinia = app.config.globalProperties.$pinia;
  const store = useStore(pinia);
  store.panelOpen = true;
  store.scanPreset();

  console.info('[预设控制] 面板已挂载');
}

// ============================================================
// 3. 主流程
// ============================================================

$(() => {
  try {
    installMagicWandMenuItem();
  } catch (error) {
    console.error('[预设控制] 魔法棒菜单挂载失败:', error);
  }

  toastr.success('预设控制脚本已加载', '🍸 BarTender', { timeOut: 2000 });
  console.info('[预设控制] 脚本已加载');
});

// ============================================================
// 4. 卸载
// ============================================================

$(window).on('pagehide', () => {
  uninstallMagicWandMenuItem();
  app?.unmount();
  app = null;
  $root?.remove();
  $root = null;
  destroyStyle?.();
  destroyStyle = null;
});
