/**
 * 全局 API 导出
 *
 * 通过 initializeGlobal 将图片托管 API 共享给其他脚本/前端界面
 */
import { useImageStore, type ImageMeta } from './image-store';

export interface ImageHostingAPI {
    /**
     * 通过显示名称获取图片 URL
     * @param displayName 图片的显示名称
     * @returns 本地路径，如 '/user/files/img_xxx.webp'，未找到返回 null
     */
    getImageUrl(displayName: string): string | null;

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

        getAllImages(): Array<{ storageName: string } & ImageMeta> {
            const imageStore = useImageStore();
            return imageStore.getAllImages();
        },
    };

    initializeGlobal('ImageHosting', api);
}
