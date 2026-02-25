/**
 * 全局 API 导出
 *
 * 通过 initializeGlobal 将图片托管 API 共享给其他脚本/前端界面
 */
import { IMAGE_REGISTRY_UPDATED_EVENT, useImageStore, type ImageMeta } from './image-store';

export interface ImageHostingAPI {
    /**
     * 通过显示名称获取图片 URL (同步, remote 模式首次可能返回原始 URL)
     * @param displayName 图片的显示名称
     * @returns URL 或 null
     */
    getImageUrl(displayName: string): string | null;

    /**
     * 通过显示名称异步获取图片 URL (支持 CDN 轮询)
     * - remote 模式: 自动进行 CDN 代理轮询, 返回最优可用 URL
     * - local/embedded 模式: 行为与同步版本一致
     */
    getImageUrlAsync(displayName: string): Promise<string | null>;

    /**
     * 获取当前角色卡的所有图片信息
     */
    getAllImages(): Array<{ storageName: string } & ImageMeta>;
}

/**
 * 注册全局 API
 */
export function registerGlobalAPI(): void {
    const api: ImageHostingAPI = {
        getImageUrl(displayName: string): string | null {
            const imageStore = useImageStore();
            return imageStore.getUrlByDisplayName(displayName);
        },

        async getImageUrlAsync(displayName: string): Promise<string | null> {
            const imageStore = useImageStore();
            return imageStore.getUrlByDisplayNameAsync(displayName);
        },

        getAllImages(): Array<{ storageName: string } & ImageMeta> {
            const imageStore = useImageStore();
            return imageStore.getAllImages();
        },
    };

    initializeGlobal('ImageHosting', api);
}

// ===== DOM 自动解析: <img data-img="显示名称"> =====

/** 已处理的元素标记 (避免重复处理) */
const RESOLVED_ATTR = 'data-img-resolved';
/** 正在异步解析中的元素标记 (避免并发重复请求) */
const RESOLVING_ATTR = 'data-img-resolving';
/** 未找到对应图片时的标记 */
const MISSING_ATTR = 'data-img-missing';

function markImgMissing(img: HTMLImageElement, displayName: string): void {
    img.setAttribute(MISSING_ATTR, displayName);
    img.removeAttribute('src');
}

function clearImgMissing(img: HTMLImageElement): void {
    img.removeAttribute(MISSING_ATTR);
}

/**
 * 解析页面中所有带 data-img 属性的 <img> 元素
 */
async function resolveImgTags(root: ParentNode = document): Promise<void> {
    const imgs = root.querySelectorAll<HTMLImageElement>('img[data-img]');
    if (imgs.length === 0) return;

    const imageStore = useImageStore();

    for (const img of imgs) {
        const displayName = img.getAttribute('data-img');
        if (!displayName) continue;

        const resolvedName = img.getAttribute(RESOLVED_ATTR);
        const resolvingName = img.getAttribute(RESOLVING_ATTR);
        const syncUrl = imageStore.getUrlByDisplayName(displayName);

        // 同一名称正在解析中, 跳过
        if (resolvingName === displayName) continue;
        // 同一名称已经成功绑定且当前 src 仍是最新解析结果, 跳过
        if (resolvedName === displayName && img.src && syncUrl === img.src) continue;

        // 先同步设置 (快速显示)
        if (syncUrl && syncUrl !== img.src) {
            img.src = syncUrl;
        }
        if (syncUrl) {
            img.setAttribute(RESOLVED_ATTR, displayName);
            clearImgMissing(img);
        } else {
            // 保持未解析状态, 允许后续重试
            img.removeAttribute(RESOLVED_ATTR);
            markImgMissing(img, displayName);
        }

        // 再异步解析 (CDN 轮询后更新)
        img.setAttribute(RESOLVING_ATTR, displayName);
        imageStore.getUrlByDisplayNameAsync(displayName)
            .then(asyncUrl => {
                if (!img.isConnected) return;
                if (img.getAttribute('data-img') !== displayName) return;

                if (asyncUrl) {
                    if (asyncUrl !== img.src) {
                        img.src = asyncUrl;
                    }
                    img.setAttribute(RESOLVED_ATTR, displayName);
                    clearImgMissing(img);
                } else {
                    // 未找到时保留未解析状态, 后续上传/重命名后可继续尝试
                    img.removeAttribute(RESOLVED_ATTR);
                    markImgMissing(img, displayName);
                }
            })
            .catch(err => {
                console.warn('[图片托管] 解析 data-img 失败:', err);
            })
            .finally(() => {
                if (!img.isConnected) return;
                if (img.getAttribute(RESOLVING_ATTR) === displayName) {
                    img.removeAttribute(RESOLVING_ATTR);
                }
            });
    }
}

function createResolveScheduler(): () => void {
    let pending = false;
    return () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            resolveImgTags().catch(err => {
                console.warn('[图片托管] 扫描 data-img 失败:', err);
            });
        });
    };
}

function bindRegistryUpdatedListener(onTrigger: () => void): () => void {
    const listener = () => onTrigger();
    window.addEventListener(IMAGE_REGISTRY_UPDATED_EVENT, listener);
    return () => window.removeEventListener(IMAGE_REGISTRY_UPDATED_EVENT, listener);
}

/**
 * 启动 DOM 观察器, 自动解析新出现的 img[data-img] 元素
 */
export function startDomObserver(): void {
    const scheduleResolve = createResolveScheduler();

    // 首次扫描
    scheduleResolve();

    // 监听注册表更新: 上传/重命名/导入后重新尝试绑定旧标签
    const unbindRegistryListener = bindRegistryUpdatedListener(scheduleResolve);

    // debounce: 合并高频 DOM 变更, 避免每次 mutation 都 querySelectorAll
    const observer = new MutationObserver(() => {
        scheduleResolve();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-img'],
    });

    // 卸载时清理监听, 避免重复注册
    $(window).on('pagehide', () => {
        observer.disconnect();
        unbindRegistryListener();
    });
}
