import {
  getActiveSession,
  getNonSensitiveRepoMeta,
  scrubLegacyPlaintextToken,
  updateActiveConfigAndVault
} from './auth.js';

const DRAFT_STORAGE_KEY = 'bds_studio_draft_v1';
const LEADS_LOCAL_KEY = 'bds_captured_leads_v1';
const IDB_NAME = 'bds_studio_uploads_db';
const IDB_STORE = 'pending_uploads';

// Xóa bỏ token lưu dạng chữ trần nếu còn từ bản cũ
scrubLegacyPlaintextToken();

// Mở IndexedDB lưu trữ các file ảnh WebP chờ đẩy lên GitHub (tránh giới hạn 5MB của localStorage)
function openUploadsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'repoPath' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingUpload(uploadItem) {
  const db = await openUploadsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(uploadItem);
    tx.oncomplete = () => resolve(uploadItem);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPendingUploads() {
  try {
    const db = await openUploadsDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearPendingUploads(repoPaths = null) {
  const db = await openUploadsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    if (!repoPaths) {
      store.clear();
    } else {
      repoPaths.forEach((p) => store.delete(p));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Đọc dữ liệu chính thức từ ./data/site-data.json
export async function fetchPublishedSiteData() {
  const cacheBust = Date.now();
  const res = await fetch(`./data/site-data.json?v=${cacheBust}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Không thể tải dữ liệu website (${res.status})`);
  }
  return await res.json();
}

// Lưu và đọc bản nháp trong BDS Studio
export function saveStudioDraft(data, dirtyCount = null) {
  const payload = {
    savedAt: new Date().toISOString(),
    dirtyCount: dirtyCount !== null ? dirtyCount : (getStudioDraftMeta().dirtyCount + 1),
    data
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function markDraftClean(data) {
  const payload = {
    savedAt: new Date().toISOString(),
    dirtyCount: 0,
    data
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function getStudioDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

export function getStudioDraftMeta() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { savedAt: null, dirtyCount: 0 };
    const parsed = JSON.parse(raw);
    return {
      savedAt: parsed?.savedAt || null,
      dirtyCount: Number(parsed?.dirtyCount || 0)
    };
  } catch {
    return { savedAt: null, dirtyCount: 0 };
  }
}

export function clearStudioDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

// Cấu hình kết nối GitHub lấy từ phiên đã mở khóa AES-256 (không bao giờ lưu token chữ trần trong localStorage)
export function getGitHubConfig() {
  const session = getActiveSession();
  if (session) {
    return {
      owner: session.owner || '',
      repo: session.repo || '',
      branch: session.branch || 'main',
      token: session.token || ''
    };
  }
  const meta = getNonSensitiveRepoMeta();
  return {
    owner: meta.owner || '',
    repo: meta.repo || '',
    branch: meta.branch || 'main',
    token: ''
  };
}

export function saveGitHubConfig(cfg) {
  return updateActiveConfigAndVault(cfg);
}

// Lưu khách hàng đăng ký tư vấn dự phòng cục bộ + gửi Webhook nếu có
export function saveLocalLead(lead) {
  try {
    const list = getLocalLeads();
    list.unshift({ id: `lead-${Date.now()}`, createdAt: new Date().toISOString(), ...lead });
    localStorage.setItem(LEADS_LOCAL_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore storage quota
  }
}

export function getLocalLeads() {
  try {
    return JSON.parse(localStorage.getItem(LEADS_LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

// Ánh xạ đường dẫn ảnh (nếu đang xem trước ảnh mới tải lên chưa đẩy GitHub thì hiển thị ngay từ IndexedDB)
export function createAssetResolver(pendingUploads = []) {
  const map = new Map();
  pendingUploads.forEach((item) => {
    if (item?.repoPath && item?.dataUrl) {
      map.set(`./${item.repoPath}`, item.dataUrl);
      map.set(item.repoPath, item.dataUrl);
    }
  });
  return (url) => {
    if (!url) return '';
    if (map.has(url)) return map.get(url);
    return url;
  };
}

// Áp dụng bảng màu & kiểu bo góc mềm mại từ dữ liệu thương hiệu lên CSS Variables
export function applyThemeToDocument(theme = {}) {
  const root = document.documentElement;
  if (theme.primary) root.style.setProperty('--color-primary', theme.primary);
  if (theme.primarySoft) root.style.setProperty('--color-primary-soft', theme.primarySoft);
  if (theme.accent) root.style.setProperty('--color-accent', theme.accent);
  if (theme.accentSoft) root.style.setProperty('--color-accent-soft', theme.accentSoft);
  if (theme.surface) root.style.setProperty('--color-surface', theme.surface);
  if (theme.surfaceAlt) root.style.setProperty('--color-surface-alt', theme.surfaceAlt);

  // Độ mềm mại bo góc
  const radiusMap = {
    soft: { card: '26px', lg: '36px', sm: '16px' },
    pill: { card: '34px', lg: '46px', sm: '22px' },
    classic: { card: '16px', lg: '22px', sm: '10px' }
  };
  const r = radiusMap[theme.radiusStyle] || radiusMap.soft;
  root.style.setProperty('--radius-card', r.card);
  root.style.setProperty('--radius-lg', r.lg);
  root.style.setProperty('--radius-sm', r.sm);

  // Kiểu chữ Tiếng Việt
  const fontMap = {
    editorial: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Be Vietnam Pro', system-ui, sans-serif"
    },
    artistic: {
      heading: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif"
    },
    modern: {
      heading: "'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif",
      body: "'Be Vietnam Pro', system-ui, sans-serif"
    }
  };
  const f = fontMap[theme.fontStyle] || fontMap.editorial;
  root.style.setProperty('--font-heading', f.heading);
  root.style.setProperty('--font-body', f.body);
}
