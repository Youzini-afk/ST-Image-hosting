/**
 * 图片压缩模块
 *
 * 使用 Canvas API 在浏览器端进行图片压缩和 WebP 转换
 */

/** 精确计算 base64 字符串对应的原始字节大小 */
function calcBase64Size(base64: string): number {
    const padding = (base64.match(/=+$/) || [''])[0].length;
    return Math.ceil((base64.length * 3) / 4) - padding;
}

export interface CompressResult {
    /** 压缩后的 base64 数据 (不含前缀) */
    base64: string;
    /** 压缩后的 MIME 类型 */
    mimeType: string;
    /** 压缩后的文件扩展名 */
    extension: string;
    /** 压缩后的大小 (bytes) */
    size: number;
}

/**
 * 压缩图片并可选转为 WebP
 *
 * @param file 原始图片文件
 * @param quality 压缩质量 (0-1)
 * @returns 压缩结果
 */
export async function compressImage(file: File, quality: number = 0.8): Promise<CompressResult> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // 优先使用 WebP, 不支持则回退 JPEG
    const mimeType = 'image/webp';
    const extension = 'webp';

    const dataUrl = canvas.toDataURL(mimeType, quality);

    // 如果浏览器不支持 WebP 导出，回退到 JPEG
    if (dataUrl.startsWith('data:image/png')) {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBase64 = jpegDataUrl.split(',')[1];
        return {
            base64: jpegBase64,
            mimeType: 'image/jpeg',
            extension: 'jpg',
            size: calcBase64Size(jpegBase64),
        };
    }

    const base64 = dataUrl.split(',')[1];
    return {
        base64,
        mimeType,
        extension,
        size: calcBase64Size(base64),
    };
}
