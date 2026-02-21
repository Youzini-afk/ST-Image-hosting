/**
 * 全局 API 导出
 *
 * 通过 initializeGlobal 将图片托管 API 共享给其他脚本/前端界面
 */
import { useImageStore, type ImageMeta } from './image-store';

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

/**
 * 解析页面中所有带 data-img 属性的 <img> 元素
 */
async function resolveImgTags(root: ParentNode = document): Promise<void> {
    const imgs = root.querySelectorAll<HTMLImageElement>(`img[data-img]:not([${RESOLVED_ATTR}])`);
    if (imgs.length === 0) return;

    const imageStore = useImageStore();

    for (const img of imgs) {
        const displayName = img.getAttribute('data-img');
        if (!displayName) continue;

        // 标记为已处理
        img.setAttribute(RESOLVED_ATTR, '1');

        // 先同步设置 (快速显示)
        const syncUrl = imageStore.getUrlByDisplayName(displayName);
        if (syncUrl) {
            img.src = syncUrl;
        }

        // 再异步解析 (CDN 轮询后更新)
        imageStore.getUrlByDisplayNameAsync(displayName).then(asyncUrl => {
            if (asyncUrl && asyncUrl !== img.src) {
                img.src = asyncUrl;
            }
        });
    }
}

/**
 * 启动 DOM 观察器, 自动解析新出现的 img[data-img] 元素
 */
export function startDomObserver(): void {
    // 首次扫描
    resolveImgTags();

    // debounce: 合并高频 DOM 变更, 避免每次 mutation 都 querySelectorAll
    let pending = false;
    const observer = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            resolveImgTags();
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}
