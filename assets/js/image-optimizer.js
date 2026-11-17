import { slugifyVN } from './default-data.js';

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không thể đọc định dạng hình ảnh này.'));
    img.src = src;
  });
}

/**
 * Nén và tối ưu hóa ảnh BĐS sang WebP ngay trên trình duyệt người dùng
 * giúp tải nhanh trên GitHub Pages và không làm nặng kho lưu trữ GitHub.
 */
export async function optimizeImageFile(file, options = {}) {
  const {
    maxWidth = 1680,
    maxHeight = 1280,
    quality = 0.84,
    prefix = 'bds'
  } = options;

  const originalSize = file.size;
  const baseName = slugifyVN(file.name.replace(/\.[^.]+$/, '')) || 'hinh-anh';
  const stamp = Date.now().toString(36);

  // Giữ nguyên nếu là file vector SVG (ví dụ Logo hoặc sơ đồ mặt bằng vector)
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const dataUrl = await readFileAsDataURL(file);
    const base64Content = dataUrl.split(',')[1] || '';
    const filename = `${prefix}-${baseName}-${stamp}.svg`;
    const repoPath = `assets/uploads/${filename}`;
    return {
      filename,
      repoPath,
      publicUrl: `./${repoPath}`,
      mimeType: 'image/svg+xml',
      base64Content,
      dataUrl,
      originalSize,
      optimizedSize: originalSize,
      savedPercent: 0
    };
  }

  const rawDataUrl = await readFileAsDataURL(file);
  const img = await loadImageElement(rawDataUrl);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Ưu tiên xuất sang WebP; nếu trình duyệt không hỗ trợ WebP thì dùng JPEG chất lượng cao
  let dataUrl = canvas.toDataURL('image/webp', quality);
  let ext = 'webp';
  let mimeType = 'image/webp';

  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    ext = 'jpg';
    mimeType = 'image/jpeg';
  }

  const base64Content = dataUrl.split(',')[1] || '';
  const optimizedSize = Math.round((base64Content.length * 3) / 4);
  const savedPercent = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
    : 0;

  const filename = `${prefix}-${baseName}-${stamp}.${ext}`;
  const repoPath = `assets/uploads/${filename}`;

  return {
    filename,
    repoPath,
    publicUrl: `./${repoPath}`,
    mimeType,
    base64Content,
    dataUrl,
    width,
    height,
    originalSize,
    optimizedSize,
    savedPercent
  };
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
