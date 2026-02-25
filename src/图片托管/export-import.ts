/**
 * 导出/导入压缩包
 *
 * 使用 JSZip 打包图片资源 + manifest.json 供分享
 * 支持 local、embedded 和已缓存的 remote 存储模式
 */
import JSZip from 'jszip';
import { uploadFile, generateStorageName } from './api';
import { ImageRegistry, useImageStore, type ImageRegistry as ImageRegistryType } from './image-store';

const MANIFEST_VERSION = 1;

/**
 * 导出当前角色卡的所有图片为 ZIP 压缩包
 */
export async function exportImages(): Promise<void> {
    const imageStore = useImageStore();
    const registryData = imageStore.getRegistryData();
    const entries = Object.entries(registryData.images);

    if (entries.length === 0) {
        toastr.warning('当前角色卡没有图片可以导出');
        return;
    }

    const zip = new JSZip();
    const imgFolder = zip.folder('images')!;
    let successCount = 0;

    for (const [storageName, meta] of entries) {
        try {
            if (meta.storage === 'embedded' && meta.base64_data) {
                // embedded 模式: 从 base64_data 直接打包
                const binaryString = atob(meta.base64_data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                imgFolder.file(storageName, bytes, { binary: true });
                successCount++;
            } else if (meta.server_path) {
                // local 模式 或 已缓存的 remote 模式: 从服务端下载
                const response = await fetch(`/${meta.server_path}`);
                if (!response.ok) {
                    console.warn(`获取图片 '${meta.display_name}' 失败 (${response.status}), 跳过`);
                    continue;
                }
                const blob = await response.blob();
                imgFolder.file(storageName, blob);
                successCount++;
            } else {
                console.warn(`图片 '${meta.display_name}' 存储数据不完整, 跳过`);
            }
        } catch (err) {
            console.warn(`处理图片 '${meta.display_name}' 失败:`, err);
        }
    }

    if (successCount === 0) {
        toastr.error('没有成功获取到任何图片文件');
        return;
    }

    // 导出时清除 base64_data 以减小 manifest 体积, 只保留元数据
    const exportManifest = klona(registryData);
    for (const meta of Object.values(exportManifest.images)) {
        meta.base64_data = '';
    }

    zip.file('manifest.json', JSON.stringify({ version: MANIFEST_VERSION, ...exportManifest }, null, 2));

    // 生成并下载 ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const characterName = substitudeMacros('{{char}}') || 'unknown';
    const fileName = `${characterName}_images.zip`;

    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toastr.success(`成功导出 ${successCount} 张图片`);
}

/**
 * 导入图片压缩包
 * 根据当前存储模式设置决定导入方式
 */
export async function importImages(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    return new Promise<void>((resolve) => {
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) {
                resolve();
                return;
            }

            try {
                const zip = await JSZip.loadAsync(file);

                // 读取 manifest
                const manifestFile = zip.file('manifest.json');
                if (!manifestFile) {
                    toastr.error('压缩包中缺少 manifest.json');
                    resolve();
                    return;
                }

                const manifestText = await manifestFile.async('string');
                const manifestRaw = JSON.parse(manifestText);
                // 兼容没有 version 的旧版 manifest, 并对结构进行运行时校验
                const parsedManifest = ImageRegistry.safeParse(manifestRaw.images ? manifestRaw : { images: {} });
                if (!parsedManifest.success) {
                    console.error('[图片托管] manifest 校验失败:', parsedManifest.error);
                    toastr.error('manifest 格式错误，无法导入');
                    resolve();
                    return;
                }
                const manifest = parsedManifest.data;

                const imagesFolder = zip.folder('images');
                if (!imagesFolder) {
                    toastr.error('压缩包中缺少 images 目录');
                    resolve();
                    return;
                }

                const imageStore = useImageStore();
                const existingNames = new Set(Object.keys(imageStore.registry.images));
                const importedImages: ImageRegistryType['images'] = {};
                let importedLocalCount = 0;
                let retainedRemoteCount = 0;
                let skippedCount = 0;
                const entries = Object.entries(manifest.images);

                for (const [origStorageName, originMeta] of entries) {
                    const imageFile = imagesFolder.file(origStorageName);
                    const meta = klona(originMeta);

                    // 生成新的 storageName 避免覆盖已有条目
                    const ext = origStorageName.split('.').pop() ?? 'png';
                    const charName = substitudeMacros('{{char}}') || 'unknown';
                    const hasConflict = existingNames.has(origStorageName)
                        || Object.prototype.hasOwnProperty.call(importedImages, origStorageName);
                    const newStorageName = hasConflict
                        ? generateStorageName(charName, ext)
                        : origStorageName;
                    existingNames.add(newStorageName);

                    try {
                        if (imageFile) {
                            // 混合策略: ZIP 中有二进制文件时, 统一按 local 导入
                            const base64 = await imageFile.async('base64');
                            const serverPath = await uploadFile(newStorageName, base64);
                            meta.server_path = serverPath;
                            meta.base64_data = '';
                            meta.remote_url = '';
                            meta.storage = 'local';
                            importedImages[newStorageName] = meta;
                            importedLocalCount++;
                        } else {
                            // ZIP 中没有文件时: remote 且有 URL 才保留为 remote
                            if (meta.storage !== 'remote' || !meta.remote_url) {
                                console.warn(`压缩包中缺少图片文件且无可用 remote_url: ${origStorageName}`);
                                skippedCount++;
                                continue;
                            }
                            meta.server_path = '';
                            meta.base64_data = '';
                            meta.storage = 'remote';
                            importedImages[newStorageName] = meta;
                            retainedRemoteCount++;
                        }
                    } catch (err) {
                        console.warn(`导入图片 '${meta.display_name}' 失败:`, err);
                        skippedCount++;
                    }
                }

                // 合并注册表
                const importedRegistry = ImageRegistry.parse({ images: importedImages });
                imageStore.mergeRegistry(importedRegistry);

                const successCount = importedLocalCount + retainedRemoteCount;
                if (successCount > 0) {
                    toastr.success(
                        `成功导入 ${successCount}/${entries.length} 张图片 (本地 ${importedLocalCount} / 远程 ${retainedRemoteCount})`,
                    );
                } else {
                    toastr.warning('没有可导入的图片条目');
                }
                if (skippedCount > 0) {
                    toastr.info(`已跳过 ${skippedCount} 条无效或缺失数据的记录`);
                }
            } catch (err) {
                console.error('导入失败:', err);
                toastr.error('导入压缩包失败, 请检查文件格式');
            }

            resolve();
        };

        input.click();
    });
}
