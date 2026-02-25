/**
 * 图片托管脚本 — 入口文件
 *
 * 为角色卡创作者提供本地图片上传、管理、导出/导入功能
 * 其他脚本/前端界面可通过 `await waitGlobalInitialized('ImageHosting')` 获取 API
 */

import { setupManagementUI } from './管理界面';
import { registerGlobalAPI, startDomObserver } from './global-api';
import { reloadOnChatChange } from '@util/script';

const SINGLETON_KEY = '__IMAGE_HOSTING_RUNTIME__';

interface ImageHostingRuntime {
    cleanup: () => void;
}

function getHostWindow(): Window & typeof globalThis {
    try {
        if (window.parent && window.parent !== window) {
            return window.parent as Window & typeof globalThis;
        }
    } catch {
        // 某些环境下访问 parent 可能受限, 退回当前窗口
    }
    return window;
}

function safeDispose(dispose: () => void, scope: string): void {
    try {
        dispose();
    } catch (error) {
        console.warn(`[图片托管] 清理 ${scope} 失败:`, error);
    }
}

function bootstrapSingleton(): void {
    const hostWindow = getHostWindow();
    const hostStore = hostWindow as unknown as Record<string, unknown>;

    const previous = hostStore[SINGLETON_KEY] as ImageHostingRuntime | undefined;
    if (previous?.cleanup) {
        safeDispose(previous.cleanup, '旧实例');
    }

    const disposers: Array<() => void> = [];
    let runtime: ImageHostingRuntime | null = null;
    let destroyed = false;
    let onPageHide: (() => void) | null = null;

    const cleanup = () => {
        if (destroyed) return;
        destroyed = true;

        if (onPageHide) {
            $(window).off('pagehide', onPageHide);
            onPageHide = null;
        }

        for (let i = disposers.length - 1; i >= 0; i--) {
            safeDispose(disposers[i], `子模块 #${i + 1}`);
        }
        disposers.length = 0;

        if (runtime && hostStore[SINGLETON_KEY] === runtime) {
            delete hostStore[SINGLETON_KEY];
        }
    };

    try {
        registerGlobalAPI();
        disposers.push(setupManagementUI());
        disposers.push(startDomObserver());

        const chatChanged = reloadOnChatChange();
        disposers.push(() => chatChanged.stop());

        onPageHide = () => cleanup();
        $(window).on('pagehide', onPageHide);

        runtime = { cleanup };
        hostStore[SINGLETON_KEY] = runtime;

        console.info('[图片托管] 脚本已加载 (单例模式)');
    } catch (error) {
        cleanup();
        throw error;
    }
}

// 加载时注册全局 API、启动 DOM 观察器、和聊天变更监听 (单例模式)
$(() => {
    bootstrapSingleton();
});
