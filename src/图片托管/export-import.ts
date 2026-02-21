/**
 * 导出/导入压缩包
 *
 * 使用 JSZip 打包图片资源 + manifest.json 供分享
 */
import JSZip from 'jszip';
import { uploadFile } from './api';
import { useImageStore, type ImageRegistry } from './image-store';

/**
 * 导出当前角色卡的所有图片为 ZIP 压缩包
 */
export async function exportImages(): Promise<void> {
    const imageStore = useImageStore();
    const images = imageStore.getAllImages();

    if (images.length === 0) {
        toastr.warning('当前角色卡没有图片可以导出');
        return;
    }

    const zip = new JSZip();

    // 创建 manifest.json
    const manifest = imageStore.getRegistryData();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 下载并打包每张图片
    const imgFolder = zip.folder('images')!;
    let successCount = 0;

    for (const image of images) {
        try {
            const response = await fetch(`/${image.server_path}`);
            if (!response.ok) {
                console.warn(`获取图片 '${image.display_name}' 失败, 跳过`);
                continue;
            }
            const blob = await response.blob();
            imgFolder.file(image.storageName, blob);
            successCount++;
        } catch (err) {
            console.warn(`下载图片 '${image.display_name}' 失败:`, err);
        }
    }

    if (successCount === 0) {
        toastr.error('没有成功获取到任何图片文件');
        return;
    }

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
                const manifest = JSON.parse(manifestText) as ImageRegistry;

                // 上传所有图片
                const imageStore = useImageStore();
                let successCount = 0;
                const imagesFolder = zip.folder('images');

                if (!imagesFolder) {
                    toastr.error('压缩包中缺少 images 目录');
                    resolve();
                    return;
                }

                const entries = Object.entries(manifest.images);
                for (const [storageName, meta] of entries) {
                    const imageFile = imagesFolder.file(storageName);
                    if (!imageFile) {
                        console.warn(`压缩包中缺少图片文件: ${storageName}`);
                        continue;
                    }

                    try {
                        const base64 = await imageFile.async('base64');
                        const serverPath = await uploadFile(storageName, base64);

                        // 更新 server_path 为新路径
                        meta.server_path = serverPath;
                        successCount++;
                    } catch (err) {
                        console.warn(`上传图片 '${meta.display_name}' 失败:`, err);
                    }
                }

                // 合并注册表
                imageStore.mergeRegistry(manifest);

                toastr.success(`成功导入 ${successCount}/${entries.length} 张图片`);
            } catch (err) {
                console.error('导入失败:', err);
                toastr.error('导入压缩包失败, 请检查文件格式');
            }

            resolve();
        };

        input.click();
    });
}
