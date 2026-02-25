/**
 * 管理界面挂载逻辑
 *
 * 在魔法棒菜单 (#extensionsMenu) 中添加「图片管理」入口
 * 点击后打开管理面板弹窗
 */
import { teleportStyle } from '@util/script';
import 管理面板 from './管理面板.vue';

let isOpen = false;
let app: ReturnType<typeof createApp> | null = null;
let $overlay: JQuery | null = null;

function getViewportInParent(): { width: number; height: number } {
    try {
        return {
            width: window.parent.innerWidth,
            height: window.parent.innerHeight,
        };
    } catch {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
}

function openPanel(): void {
    if (isOpen) return;
    isOpen = true;

    const overlay = $('<div>')
        .css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99990,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        })
        .appendTo('body');

    // 创建遮罩层
    overlay.on('click', (e) => {
        if (e.target === overlay[0]) closePanel();
    });
    $overlay = overlay;

    // 创建面板容器 (桌面端更宽, 使用 parent 窗口尺寸因为脚本运行在 iframe 中)
    const viewport = getViewportInParent();
    const isDesktop = viewport.width > viewport.height;
    const $panel = $('<div>')
        .css({
            background: 'var(--SmartThemeBlurTintColor, #1a1a2e)',
            borderRadius: '12px',
            border: '1px solid var(--SmartThemeBorderColor, #444)',
            width: isDesktop ? 'min(900px, 95vw)' : 'min(500px, 90vw)',
            maxHeight: '85vh',
            overflow: 'auto',
            padding: '15px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            position: 'relative',
        })
        .appendTo($overlay);

    // 关闭按钮
    $('<button>')
        .html('<i class="fa-solid fa-xmark"></i>')
        .css({
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--SmartThemeBodyDisplayColor, #ccc)',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10',
            transition: 'all 0.2s',
        })
        .on('mouseenter', function () { $(this).css({ background: 'rgba(255,91,91,0.15)', color: '#ff5b5b', borderColor: 'rgba(255,91,91,0.3)' }); })
        .on('mouseleave', function () { $(this).css({ background: 'rgba(255,255,255,0.08)', color: 'var(--SmartThemeBodyDisplayColor, #ccc)', borderColor: 'rgba(255,255,255,0.15)' }); })
        .on('click', () => closePanel())
        .appendTo($panel);

    // Vue 挂载到独立的子容器 (mount 会替换目标元素的 innerHTML, 不能直接挂到 $panel 上否则关闭按钮会被覆盖)
    const $vueRoot = $('<div>').appendTo($panel);
    app = createApp(管理面板).use(createPinia());
    app.mount($vueRoot[0]);
}

function closePanel(): void {
    if (!isOpen) return;
    isOpen = false;

    app?.unmount();
    app = null;
    $overlay?.remove();
    $overlay = null;
}

export function setupManagementUI(): () => void {
    // 将 <style scoped> 复制到酒馆网页的 <head> 中, 否则样式不会在 iframe 外生效
    const { destroy: destroyStyle } = teleportStyle();
    const onMenuClick = () => openPanel();

    // 在魔法棒菜单中添加「图片管理」入口
    const $menuItem = $('<div>')
        .addClass('list-group-item flex-container flexGap5 interactable')
        .attr({ tabindex: '0', role: 'listitem' })
        .on('click', onMenuClick)
        .append(
            $('<div>').addClass('fa-fw fa-solid fa-images extensionsMenuExtensionButton'),
            $('<span>').text('图片管理'),
        );

    const $menuContainer = $('<div>')
        .addClass('extension_container')
        .append($menuItem)
        .appendTo('#extensionsMenu');

    let destroyed = false;
    return () => {
        if (destroyed) return;
        destroyed = true;

        closePanel();
        $menuItem.off('click', onMenuClick);
        $menuContainer.remove();
        destroyStyle();
    };
}
