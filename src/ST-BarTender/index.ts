// ============================================================
// 预设控制脚本入口
// ============================================================

import { createScriptIdIframe, teleportStyle } from '@util/script';
import Panel from './Panel.vue';
import { useStore } from './store';

const BUTTON_NAME = '预设控制';

$(() => {
  // 注册魔法棒按钮
  appendInexistentScriptButtons([{ name: BUTTON_NAME, visible: true }]);

  let $iframe: JQuery<HTMLIFrameElement> | null = null;
  let app: ReturnType<typeof createApp> | null = null;
  let pinia: ReturnType<typeof createPinia> | null = null;
  let styleDestroy: (() => void) | null = null;

  function openPanel() {
    if ($iframe) {
      $iframe.toggle();
      return;
    }

    pinia = createPinia();
    app = createApp(Panel).use(pinia);

    $iframe = createScriptIdIframe()
      .css({
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        border: 'none',
        'z-index': '99998',
        'pointer-events': 'none',
        background: 'transparent',
      })
      .appendTo('body')
      .on('load', function () {
        const iframeDoc = this.contentDocument!;

        iframeDoc.body.style.cssText = `
          margin: 0;
          padding: 0;
          background: transparent;
          pointer-events: none;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        `;

        const mountDiv = iframeDoc.createElement('div');
        mountDiv.style.cssText = 'pointer-events: auto; position: fixed; top: 0; left: 0;';
        iframeDoc.body.appendChild(mountDiv);

        // 注入 Font Awesome
        const faLink = iframeDoc.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://testingcf.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/css/all.min.css';
        iframeDoc.head.appendChild(faLink);

        // 传送样式
        const { destroy } = teleportStyle(iframeDoc.head);
        styleDestroy = destroy;

        // 挂载 Vue
        app!.mount(mountDiv);

        const store = useStore(pinia!);
        store.panelOpen = true;
        store.scanPreset();

        console.info('[预设控制] 面板已挂载');
      });
  }

  function closePanel() {
    if ($iframe) {
      $iframe.hide();
    }
  }

  // 按钮点击事件
  eventOn(getButtonEvent(BUTTON_NAME), () => {
    if ($iframe && $iframe.is(':visible')) {
      closePanel();
    } else {
      openPanel();
    }
  });

  // 卸载
  $(window).on('pagehide', () => {
    app?.unmount();
    $iframe?.remove();
    styleDestroy?.();
    app = null;
    $iframe = null;
    pinia = null;
    styleDestroy = null;
  });

  // 加载通知
  toastr.success('预设控制脚本已加载', '🍸 BarTender', { timeOut: 2000 });
  console.info('[预设控制] 脚本已加载');
});
