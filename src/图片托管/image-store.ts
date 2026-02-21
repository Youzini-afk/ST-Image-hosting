/**
 * 图片元数据管理 (持久化到角色卡变量)
 *
 * 每张角色卡拥有独立的图片注册表，实现角色卡级别的隔离
 */
import { uploadFile, deleteFile, verifyFiles, fileToBase64, generateStorageName } from './api';
import { compressImage } from './compress';
import { useSettingsStore } from './settings';

/** 单张图片的元数据 */
const ImageMeta = z.object({
    display_name: z.string(),
    original_name: z.string(),
    mime_type: z.string(),
    size: z.coerce.number(),
    uploaded_at: z.coerce.number(),
    server_path: z.string(),
});
export type ImageMeta = z.infer<typeof ImageMeta>;

/** 角色卡的图片注册表 */
const ImageRegistry = z
    .object({
        /** storage_name -> ImageMeta */
        images: z.record(z.string(), ImageMeta).prefault({}),
    })
    .prefault({});
export type ImageRegistry = z.infer<typeof ImageRegistry>;

function getCharacterName(): string {
    const name = getCharacterNames().find(
        (n: string) => n === substitudeMacros('{{char}}'),
    );
    return name ?? 'unknown';
}

function loadRegistry(): ImageRegistry {
    const vars = getVariables({ type: 'character' });
    return ImageRegistry.parse(_.get(vars, 'image_hosting', {}));
}

function saveRegistry(registry: ImageRegistry): void {
    updateVariablesWith(
        vars => _.set(vars, 'image_hosting', klona(registry)),
        { type: 'character' },
    );
}

export const useImageStore = defineStore('image-hosting-images', () => {
    const registry = ref(loadRegistry());
    const settingsStore = useSettingsStore();

    /** 上传一张图片 */
    async function upload(file: File): Promise<string> {
        let base64: string;
        let mimeType = file.type;
        let extension = file.name.split('.').pop() ?? 'png';
        let fileSize = file.size;

        // 可选压缩
        if (settingsStore.settings.auto_compress && file.type.startsWith('image/')) {
            const compressed = await compressImage(file, settingsStore.settings.compress_quality);
            base64 = compressed.base64;
            mimeType = compressed.mimeType;
            extension = compressed.extension;
            fileSize = compressed.size;
        } else {
            base64 = await fileToBase64(file);
        }

        const storageName = generateStorageName(getCharacterName(), extension);
        const serverPath = await uploadFile(storageName, base64);

        const meta: ImageMeta = {
            display_name: file.name.replace(/\.[^.]+$/, ''),
            original_name: file.name,
            mime_type: mimeType,
            size: fileSize,
            uploaded_at: Date.now(),
            server_path: serverPath,
        };

        registry.value.images[storageName] = meta;
        saveRegistry(registry.value);
        return storageName;
    }

    /** 删除一张图片 */
    async function remove(storageName: string): Promise<void> {
        const meta = registry.value.images[storageName];
        if (!meta) return;

        try {
            await deleteFile(meta.server_path);
        } catch (err) {
            console.warn(`删除服务端文件失败, 仅从注册表移除: ${err}`);
        }

        delete registry.value.images[storageName];
        saveRegistry(registry.value);
    }

    /** 重命名图片的显示名称 */
    function rename(storageName: string, newDisplayName: string): void {
        const meta = registry.value.images[storageName];
        if (!meta) return;
        meta.display_name = newDisplayName;
        saveRegistry(registry.value);
    }

    /** 通过显示名称获取图片 URL */
    function getUrlByDisplayName(displayName: string): string | null {
        const entry = _.find(registry.value.images, (meta) => meta.display_name === displayName);
        if (!entry) return null;
        return `/${entry.server_path}`;
    }

    /** 通过存储名称获取图片 URL */
    function getUrlByStorageName(storageName: string): string | null {
        const meta = registry.value.images[storageName];
        if (!meta) return null;
        return `/${meta.server_path}`;
    }

    /** 获取所有图片列表 */
    function getAllImages(): Array<{ storageName: string } & ImageMeta> {
        return _.map(registry.value.images, (meta, storageName) => ({
            storageName,
            ...meta,
        }));
    }

    /** 验证所有图片文件的完整性 */
    async function verify(): Promise<Record<string, boolean>> {
        const urls = _.map(registry.value.images, meta => meta.server_path);
        if (urls.length === 0) return {};
        return verifyFiles(urls);
    }

    /** 重新从角色卡变量加载注册表 */
    function reload(): void {
        registry.value = loadRegistry();
    }

    /** 获取原始注册表数据 (供导出使用) */
    function getRegistryData(): ImageRegistry {
        return klona(registry.value);
    }

    /** 导入注册表数据 (供导入使用) */
    function mergeRegistry(incoming: ImageRegistry): void {
        _.assign(registry.value.images, incoming.images);
        saveRegistry(registry.value);
    }

    return {
        registry,
        upload,
        remove,
        rename,
        getUrlByDisplayName,
        getUrlByStorageName,
        getAllImages,
        verify,
        reload,
        getRegistryData,
        mergeRegistry,
    };
});
