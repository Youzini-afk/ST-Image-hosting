import { createScriptIdDiv, teleportStyle } from '@util/script';
import App from './App.vue';

let app: ReturnType<typeof createApp> | null = null;
let destroyStyle: (() => void) | null = null;
let $root: JQuery<HTMLDivElement> | null = null;

export function mountUi() {
  if (app) {
    return;
  }

  app = createApp(App).use(createPinia());
  $root = createScriptIdDiv().appendTo('#extensions_settings2');
  app.mount($root[0]);

  const style = teleportStyle();
  destroyStyle = style.destroy;
}

export function unmountUi() {
  app?.unmount();
  app = null;
  $root?.remove();
  $root = null;
  destroyStyle?.();
  destroyStyle = null;
}
