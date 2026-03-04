import { initRuntime, disposeRuntime } from './runtime/main';
import { mountUi, unmountUi } from './ui';

$(() => {
  initRuntime();
  mountUi();
});

$(window).on('pagehide', () => {
  unmountUi();
  disposeRuntime();
});
