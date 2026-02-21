/**
 * 管理界面挂载逻辑
 *
 * 将 Vue 管理面板挂载到酒馆助手设置面板中
 */
import { createScriptIdDiv, teleportStyle } from '@util/script';
import 管理面板 from './管理面板.vue';

$(() => {
    const app = createApp(管理面板).use(createPinia());

    const $app = createScriptIdDiv().appendTo('#extensions_settings2');
    app.mount($app[0]);

    const { destroy } = teleportStyle();

    $(window).on('pagehide', () => {
        app.unmount();
        $app.remove();
        destroy();
    });
});
