import { verifyGitHubConnection } from './github-sync.js';

const VAULT_STORAGE_KEY = 'bds_studio_auth_vault_v1';
const LOCKOUT_STORAGE_KEY = 'bds_studio_auth_lockout_v1';
const SESSION_STORAGE_KEY = 'bds_studio_active_session_v1';
const LEGACY_GITHUB_CONFIG_KEY = 'bds_studio_github_config_v1';

// Tự động khóa phiên làm việc sau 30 phút không thao tác
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

let memorySession = null;
let sessionCryptoMaterial = null; // { key: CryptoKey, salt: Uint8Array } chỉ nằm trong RAM
let lastTouchWrite = 0;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function ensureWebCrypto() {
  if (!window.crypto?.subtle) {
    throw new Error(
      'Trình duyệt hiện tại chưa bật ngữ cảnh bảo mật (HTTPS hoặc localhost) để kích hoạt mã hóa AES-256.'
    );
  }
}

async function deriveAesKey(password, saltBytes) {
  ensureWebCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function sealWithKey(payloadObj, key, saltBytes) {
  ensureWebCrypto();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payloadObj));
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    salt: bytesToBase64(saltBytes),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf))
  };
}

export function isLocalDevEnvironment() {
  const host = (window.location.hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    window.location.protocol === 'file:'
  );
}

/**
 * Xóa bỏ token lưu dạng chữ trần (plaintext) từ phiên bản cũ nếu còn sót trong localStorage
 */
export function scrubLegacyPlaintextToken() {
  try {
    const raw = localStorage.getItem(LEGACY_GITHUB_CONFIG_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token) {
      localStorage.setItem(
        LEGACY_GITHUB_CONFIG_KEY,
        JSON.stringify({
          owner: (parsed.owner || '').trim(),
          repo: (parsed.repo || '').trim(),
          branch: (parsed.branch || 'main').trim() || 'main'
        })
      );
    }
  } catch {
    localStorage.removeItem(LEGACY_GITHUB_CONFIG_KEY);
  }
}

export function getNonSensitiveRepoMeta() {
  const vault = getVaultMeta();
  if (vault?.owner || vault?.repo) {
    return {
      owner: vault.owner || '',
      repo: vault.repo || '',
      branch: vault.branch || 'main'
    };
  }
  try {
    const raw = localStorage.getItem(LEGACY_GITHUB_CONFIG_KEY);
    if (!raw) return { owner: '', repo: '', branch: 'main' };
    const parsed = JSON.parse(raw);
    return {
      owner: (parsed.owner || '').trim(),
      repo: (parsed.repo || '').trim(),
      branch: (parsed.branch || 'main').trim() || 'main'
    };
  } catch {
    return { owner: '', repo: '', branch: 'main' };
  }
}

function saveNonSensitiveRepoMeta({ owner = '', repo = '', branch = 'main' }) {
  try {
    localStorage.setItem(
      LEGACY_GITHUB_CONFIG_KEY,
      JSON.stringify({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main'
      })
    );
  } catch {
    // ignore storage quota
  }
}

/**
 * Tự động nhận diện Repository gắn liền với tên miền hiện tại để chống đăng nhập chéo bằng repo lạ
 */
export function detectHostedRepoBinding(publishedSiteData = null) {
  const host = (window.location.hostname || '').toLowerCase();

  // 1. Đang chạy trực tiếp trên GitHub Pages (<owner>.github.io/<repo>)
  if (host.endsWith('.github.io')) {
    const owner = host.replace(/\.github\.io$/i, '');
    const segments = window.location.pathname.split('/').filter(Boolean);
    // Nếu đường dẫn dạng /<ten-repo>/studio.html -> segments[0] là tên repo
    // Nếu dạng /studio.html trên trang cá nhân <owner>.github.io -> repo chính là <owner>.github.io
    const firstSeg = segments[0] || '';
    const isRootUserSite = !firstSeg || firstSeg.toLowerCase().endsWith('.html');
    const repo = isRootUserSite ? host : firstSeg;

    return {
      owner,
      repo,
      locked: true,
      source: 'github_pages'
    };
  }

  // 2. Đang chạy trên tên miền riêng (VD: bdsquang.vn) đã xuất bản có meta repoOwner & repoName
  if (!isLocalDevEnvironment() && publishedSiteData?.meta?.repoOwner && publishedSiteData?.meta?.repoName) {
    return {
      owner: String(publishedSiteData.meta.repoOwner).trim(),
      repo: String(publishedSiteData.meta.repoName).trim(),
      locked: true,
      source: 'site_meta'
    };
  }

  // 3. Môi trường Localhost hoặc lần đầu chưa gắn tên miền
  const saved = getNonSensitiveRepoMeta();
  return {
    owner: saved.owner || '',
    repo: saved.repo || '',
    locked: false,
    source: 'manual'
  };
}

export function getVaultMeta() {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.ciphertext || !v?.salt || !v?.iv) return null;
    return {
      owner: v.owner || '',
      repo: v.repo || '',
      branch: v.branch || 'main',
      adminLogin: v.adminLogin || v.owner || '',
      adminAvatar: v.adminAvatar || '',
      updatedAt: v.updatedAt || null
    };
  } catch {
    return null;
  }
}

export function hasSavedVault() {
  return Boolean(getVaultMeta());
}

/* ================= CHỐNG DÒ MẬT KHẨU (BRUTE-FORCE LOCKOUT) ================= */
export function getLockoutStatus() {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { isLockedOut: false, remainingSeconds: 0, failedCount: 0 };
    const state = JSON.parse(raw);
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      return {
        isLockedOut: true,
        remainingSeconds: Math.ceil((state.lockedUntil - now) / 1000),
        failedCount: Number(state.failedCount || 0)
      };
    }
    return {
      isLockedOut: false,
      remainingSeconds: 0,
      failedCount: Number(state.failedCount || 0)
    };
  } catch {
    return { isLockedOut: false, remainingSeconds: 0, failedCount: 0 };
  }
}

function recordFailedAttempt() {
  const cur = getLockoutStatus();
  const nextCount = cur.failedCount + 1;
  let lockedUntil = 0;
  if (nextCount >= 8) {
    lockedUntil = Date.now() + 5 * 60 * 1000; // Khóa 5 phút
  } else if (nextCount >= 5) {
    lockedUntil = Date.now() + 60 * 1000; // Khóa 60 giây
  }
  localStorage.setItem(
    LOCKOUT_STORAGE_KEY,
    JSON.stringify({ failedCount: nextCount, lockedUntil })
  );
  return { failedCount: nextCount, lockedUntil };
}

function resetFailedAttempts() {
  localStorage.removeItem(LOCKOUT_STORAGE_KEY);
}

/* ================= QUẢN LÝ PHIÊN ĐĂNG NHẬP TRONG TAB ================= */
function persistActiveSession(sessionObj) {
  const payload = {
    ...sessionObj,
    lastActiveAt: Date.now()
  };
  memorySession = payload;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  return payload;
}

export function getActiveSession() {
  if (!memorySession) {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        memorySession = JSON.parse(raw);
      }
    } catch {
      memorySession = null;
    }
  }

  if (!memorySession) return null;

  const elapsed = Date.now() - Number(memorySession.lastActiveAt || 0);
  if (elapsed > IDLE_TIMEOUT_MS) {
    lockStudioSession();
    return null;
  }

  return memorySession;
}

export function touchActiveSession() {
  if (!memorySession) return;
  const now = Date.now();
  if (now - lastTouchWrite < 15000) return;
  lastTouchWrite = now;
  memorySession.lastActiveAt = now;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(memorySession));
  } catch {
    // ignore
  }
}

export function lockStudioSession() {
  memorySession = null;
  sessionCryptoMaterial = null;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resetSavedVault() {
  localStorage.removeItem(VAULT_STORAGE_KEY);
  resetFailedAttempts();
  lockStudioSession();
}

/* ================= ĐĂNG NHẬP LẦN ĐẦU & MÃ HÓA KÉT AES-256 ================= */
export async function setupAdminVaultAndLogin({
  owner,
  repo,
  branch = 'main',
  token,
  password,
  boundRepo = null
}) {
  const cleanOwner = (owner || '').trim();
  const cleanRepo = (repo || '').trim();
  const cleanBranch = (branch || 'main').trim() || 'main';
  const cleanToken = (token || '').trim();
  const cleanPass = String(password || '');

  if (!cleanOwner || !cleanRepo || !cleanToken) {
    throw new Error('Vui lòng nhập đầy đủ GitHub Username, Tên Repository và Personal Access Token.');
  }

  if (cleanPass.length < 4) {
    throw new Error('Vui lòng đặt Mật khẩu mở khóa nhanh tối thiểu 4 ký tự.');
  }

  if (boundRepo?.locked) {
    if (
      cleanOwner.toLowerCase() !== boundRepo.owner.toLowerCase() ||
      cleanRepo.toLowerCase() !== boundRepo.repo.toLowerCase()
    ) {
      throw new Error(
        `Trang quản trị này đã khóa cố định với kho lưu trữ "${boundRepo.owner}/${boundRepo.repo}". Không thể đăng nhập bằng kho lưu trữ khác.`
      );
    }
  }

  // Kiểm tra trực tiếp trên máy chủ GitHub API xem Token có hợp lệ và có quyền Push/Admin không
  const verified = await verifyGitHubConnection({
    owner: cleanOwner,
    repo: cleanRepo,
    branch: cleanBranch,
    token: cleanToken
  });

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(cleanPass, salt);

  const secretPayload = {
    owner: cleanOwner,
    repo: cleanRepo,
    branch: verified.branch || cleanBranch,
    token: cleanToken,
    adminLogin: verified.adminLogin,
    adminAvatar: verified.adminAvatar
  };

  const sealed = await sealWithKey(secretPayload, key, salt);

  const vaultRecord = {
    version: 1,
    owner: cleanOwner,
    repo: cleanRepo,
    branch: verified.branch || cleanBranch,
    adminLogin: verified.adminLogin,
    adminAvatar: verified.adminAvatar,
    updatedAt: new Date().toISOString(),
    ...sealed
  };

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaultRecord));
  saveNonSensitiveRepoMeta(secretPayload);
  scrubLegacyPlaintextToken();
  resetFailedAttempts();

  sessionCryptoMaterial = { key, salt };
  const session = persistActiveSession({
    mode: 'github',
    ...secretPayload
  });

  return { session, verified };
}

/* ================= MỞ KHÓA NHANH BẰNG MẬT KHẨU ================= */
export async function unlockWithPassword(password, boundRepo = null) {
  const lockout = getLockoutStatus();
  if (lockout.isLockedOut) {
    throw new Error(
      `Nhập sai quá nhiều lần. Vui lòng đợi ${lockout.remainingSeconds} giây nữa để thử lại.`
    );
  }

  const rawVault = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!rawVault) {
    throw new Error('Chưa có khóa bảo mật trên trình duyệt này. Vui lòng xác thực bằng GitHub Token.');
  }

  const cleanPass = String(password || '');
  if (!cleanPass) {
    throw new Error('Vui lòng nhập mật khẩu mở khóa Quản trị.');
  }

  let vault;
  try {
    vault = JSON.parse(rawVault);
  } catch {
    resetSavedVault();
    throw new Error('Dữ liệu khóa bảo mật bị hỏng. Vui lòng đăng nhập lại bằng GitHub Token.');
  }

  try {
    const saltBytes = base64ToBytes(vault.salt);
    const ivBytes = base64ToBytes(vault.iv);
    const cipherBytes = base64ToBytes(vault.ciphertext);

    const key = await deriveAesKey(cleanPass, saltBytes);
    const plainBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );

    const secretPayload = JSON.parse(new TextDecoder('utf-8').decode(plainBuf));

    if (boundRepo?.locked) {
      if (
        (secretPayload.owner || '').toLowerCase() !== boundRepo.owner.toLowerCase() ||
        (secretPayload.repo || '').toLowerCase() !== boundRepo.repo.toLowerCase()
      ) {
        throw new Error(
          `Khóa lưu trước đó không khớp với kho lưu trữ "${boundRepo.owner}/${boundRepo.repo}". Hãy xác thực lại bằng GitHub Token.`
        );
      }
    }

    resetFailedAttempts();
    sessionCryptoMaterial = { key, salt: saltBytes };

    return persistActiveSession({
      mode: 'github',
      owner: secretPayload.owner,
      repo: secretPayload.repo,
      branch: secretPayload.branch || 'main',
      token: secretPayload.token,
      adminLogin: secretPayload.adminLogin || vault.adminLogin || secretPayload.owner,
      adminAvatar: secretPayload.adminAvatar || vault.adminAvatar || ''
    });
  } catch (err) {
    if (err.message?.includes('không khớp với kho lưu trữ')) {
      throw err;
    }
    const failState = recordFailedAttempt();
    const left = Math.max(0, 5 - failState.failedCount);
    if (failState.lockedUntil > Date.now()) {
      const waitSec = Math.ceil((failState.lockedUntil - Date.now()) / 1000);
      throw new Error(`Sai mật khẩu! Tạm khóa đăng nhập trong ${waitSec} giây để chống dò mật khẩu.`);
    }
    throw new Error(
      `Mật khẩu mở khóa không chính xác!${left > 0 ? ` (Còn ${left} lần thử trước khi tạm khóa)` : ''}`
    );
  }
}

/* ================= CHẾ ĐỘ THỬ NGHIỆM NỘI BỘ TRÊN LOCALHOST ================= */
export function loginLocalDevMode() {
  if (!isLocalDevEnvironment()) {
    throw new Error('Chế độ nội bộ chỉ khả dụng khi chạy trực tiếp trên máy cá nhân (localhost).');
  }
  const meta = getNonSensitiveRepoMeta();
  return persistActiveSession({
    mode: 'local',
    owner: meta.owner || '',
    repo: meta.repo || '',
    branch: meta.branch || 'main',
    token: '',
    adminLogin: 'Localhost (Máy cá nhân)',
    adminAvatar: ''
  });
}

/* ================= CẬP NHẬT CẤU HÌNH KHI ĐANG ĐĂNG NHẬP & ĐỔI MẬT KHẨU ================= */
export async function updateActiveConfigAndVault(cfg) {
  const current = getActiveSession() || {};
  const nextPayload = {
    owner: (cfg.owner ?? current.owner ?? '').trim(),
    repo: (cfg.repo ?? current.repo ?? '').trim(),
    branch: (cfg.branch ?? current.branch ?? 'main').trim() || 'main',
    token: (cfg.token ?? current.token ?? '').trim(),
    adminLogin: cfg.adminLogin || current.adminLogin || (cfg.owner || '').trim(),
    adminAvatar: cfg.adminAvatar ?? current.adminAvatar ?? ''
  };

  saveNonSensitiveRepoMeta(nextPayload);
  scrubLegacyPlaintextToken();

  persistActiveSession({
    mode: nextPayload.token ? 'github' : (current.mode || 'local'),
    ...nextPayload
  });

  // Nếu khóa mã hóa đang mở trong RAM và có token, tự động niêm phong lại vào két AES-256
  if (sessionCryptoMaterial?.key && sessionCryptoMaterial?.salt && nextPayload.token) {
    const sealed = await sealWithKey(nextPayload, sessionCryptoMaterial.key, sessionCryptoMaterial.salt);
    const vaultRecord = {
      version: 1,
      owner: nextPayload.owner,
      repo: nextPayload.repo,
      branch: nextPayload.branch,
      adminLogin: nextPayload.adminLogin,
      adminAvatar: nextPayload.adminAvatar,
      updatedAt: new Date().toISOString(),
      ...sealed
    };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaultRecord));
  }
}

export async function changeVaultPassword({ currentPassword, newPassword }) {
  if (!newPassword || String(newPassword).length < 4) {
    throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
  }

  // Giải mã bằng mật khẩu hiện tại để xác minh chính chủ
  const unlocked = await unlockWithPassword(currentPassword);

  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveAesKey(String(newPassword), newSalt);

  const secretPayload = {
    owner: unlocked.owner,
    repo: unlocked.repo,
    branch: unlocked.branch || 'main',
    token: unlocked.token,
    adminLogin: unlocked.adminLogin,
    adminAvatar: unlocked.adminAvatar
  };

  const sealed = await sealWithKey(secretPayload, newKey, newSalt);
  localStorage.setItem(
    VAULT_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      owner: secretPayload.owner,
      repo: secretPayload.repo,
      branch: secretPayload.branch,
      adminLogin: secretPayload.adminLogin,
      adminAvatar: secretPayload.adminAvatar,
      updatedAt: new Date().toISOString(),
      ...sealed
    })
  );

  sessionCryptoMaterial = { key: newKey, salt: newSalt };
  return true;
}
