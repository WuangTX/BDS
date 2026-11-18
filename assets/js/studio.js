import { AMENITY_LIBRARY, PROJECT_TEMPLATES, THEME_PRESETS, slugifyVN } from './default-data.js';
import { formatBytes, optimizeImageFile } from './image-optimizer.js';
import { SAMPLE_RAW_PROJECT_TEXT, parseSmartProjectText } from './smart-parser.js';
import {
  clearPendingUploads,
  createAssetResolver,
  fetchPublishedSiteData,
  getAllPendingUploads,
  getGitHubConfig,
  getLocalLeads,
  getStudioDraft,
  getStudioDraftMeta,
  markDraftClean,
  saveGitHubConfig,
  savePendingUpload,
  saveStudioDraft
} from './store.js';
import {
  enableGitHubPagesWorkflow,
  fetchLatestDeployStatus,
  publishToGitHub,
  pullSiteDataFromGitHub,
  verifyGitHubConnection
} from './github-sync.js';
import {
  changeVaultPassword,
  detectHostedRepoBinding,
  getActiveSession,
  getLockoutStatus,
  getVaultMeta,
  hasSavedVault,
  isLocalDevEnvironment,
  lockStudioSession,
  loginLocalDevMode,
  resetSavedVault,
  setupAdminVaultAndLogin,
  touchActiveSession,
  unlockWithPassword
} from './auth.js';

let siteData = null;
let publishedMetaSource = null;
let pendingUploads = [];
let resolveAsset = (u) => u || '';
let currentTab = 'dashboard';
let editingProjectId = null;
let activeProjectEditorTab = 'basic';
let editingNewsId = null;
let previewDevice = 'desktop';
let previewRoute = '#/';
let deferredPwaPrompt = null;
let globalEventsBound = false;
let inactivityWatchTimer = null;
let lockoutCountdownTimer = null;

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const el = document.getElementById('studioToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('show'), 3400);
}

async function refreshUploadResolver() {
  pendingUploads = await getAllPendingUploads();
  resolveAsset = createAssetResolver(pendingUploads);
}

function persistChanges(toastMessage = '') {
  saveStudioDraft(siteData);
  updateTopStatusUI();
  syncSidebarCounters();
  if (toastMessage) showToast(toastMessage);
}

function syncSidebarCounters() {
  const pCount = document.getElementById('navProjectsCount');
  const nCount = document.getElementById('navNewsCount');
  const logo = document.getElementById('sidebarLogo');
  if (pCount) pCount.textContent = String((siteData?.projects || []).length);
  if (nCount) nCount.textContent = String((siteData?.news || []).length);
  if (logo && siteData?.brand?.logoUrl) logo.src = resolveAsset(siteData.brand.logoUrl);
}

function updateTopStatusUI() {
  const meta = getStudioDraftMeta();
  const dot = document.getElementById('draftStatusDot');
  const text = document.getElementById('draftStatusText');
  const imgCount = pendingUploads.length;

  if (meta.dirtyCount > 0 || imgCount > 0) {
    dot?.classList.add('dirty');
    const parts = [];
    if (meta.dirtyCount > 0) parts.push(`Đã tự lưu bản nháp (${meta.dirtyCount} chỉnh sửa)`);
    if (imgCount > 0) parts.push(`${imgCount} ảnh WebP mới chờ xuất bản`);
    if (text) text.textContent = parts.join(' • ');
  } else {
    dot?.classList.remove('dirty');
    if (text) text.textContent = 'Đồng bộ hoàn tất — Sẵn sàng tạo dự án mới';
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('#studioNav .st-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  renderWorkspace();
}

function renderWorkspace() {
  const ws = document.getElementById('studioWorkspace');
  if (!ws || !siteData) return;

  if (currentTab === 'dashboard') renderDashboard(ws);
  else if (currentTab === 'projects') renderProjectsWorkspace(ws);
  else if (currentTab === 'brand') renderBrandWorkspace(ws);
  else if (currentTab === 'news') renderNewsWorkspace(ws);
  else if (currentTab === 'preview') renderLivePreviewWorkspace(ws);
  else if (currentTab === 'publish') renderPublishWorkspace(ws);
}

/* ================= 1. DASHBOARD & TẠO NHANH ================= */
function renderDashboard(ws) {
  const projects = siteData.projects || [];
  const news = siteData.news || [];
  const leads = getLocalLeads();
  const ghCfg = getGitHubConfig();

  ws.innerHTML = `
    <div class="st-card" style="background:linear-gradient(135deg,#0E3A2F 0%,#185747 100%);color:#FAF8F4;border:none;">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px;">
        <div style="max-width:680px;">
          <div style="font-size:0.78rem;letter-spacing:0.15em;text-transform:uppercase;color:#E6C987;font-weight:700;margin-bottom:6px;">
            HỆ THỐNG TỐI ƯU QUY TRÌNH BẤT ĐỘNG SẢN
          </div>
          <h1 style="margin:0 0 8px;font-size:1.75rem;">Xin chào! Quản trị ${escapeHTML(siteData.brand?.name || 'Website BĐS')}</h1>
          <p style="margin:0;color:rgba(250,248,244,0.85);font-size:0.95rem;">
            Tạo Landing Page dự án mới chỉ trong 60 giây, kéo-thả tự động nén ảnh WebP nhẹ trang và bấm <strong>1 nút Xuất bản</strong> thẳng lên GitHub — không cần mở code hay gõ lệnh <code>git push</code>.
          </p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" class="st-btn st-btn-publish" id="dashOpenSmartPaste">⚡ Dán nhanh từ Zalo/Word</button>
          <button type="button" class="st-btn st-btn-outline" style="background:rgba(255,255,255,0.12);color:#FFF;border-color:rgba(255,255,255,0.25);" id="dashOpenTemplates">+ Tạo từ Mẫu chuẩn</button>
        </div>
      </div>
    </div>

    <div class="st-kpi-grid">
      <div class="st-kpi-box">
        <strong>${projects.length}</strong>
        <span>Tổng số Dự án BĐS</span>
      </div>
      <div class="st-kpi-box">
        <strong>${projects.filter((p) => p.status === 'Đang mở bán').length}</strong>
        <span>Dự án Đang mở bán</span>
      </div>
      <div class="st-kpi-box">
        <strong>${news.length}</strong>
        <span>Bài viết Tin tức &amp; Tiến độ</span>
      </div>
      <div class="st-kpi-box">
        <strong>${ghCfg.owner && ghCfg.repo ? 'Đã kết nối' : 'Chưa kết nối'}</strong>
        <span>Kho lưu trữ GitHub (${escapeHTML(ghCfg.repo || 'Chưa cài đặt')})</span>
      </div>
    </div>

    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">3 Quy Trình Rút Ngắn 85% Thời Gian Làm Dự Án</h2>
          <p class="st-subtitle">Chọn cách phù hợp nhất với nguồn tài liệu dự án bạn đang có</p>
        </div>
      </div>

      <div class="accelerator-grid">
        <div class="accelerator-card">
          <div style="font-size:1.6rem;">⚡</div>
          <h3 style="margin:0;color:var(--st-primary);">1. Dán Nhanh Từ Zalo / Word</h3>
          <p style="margin:0;font-size:0.88rem;color:var(--st-muted);flex:1;">
            Copy nguyên đoạn giới thiệu dự án từ tin nhắn Zalo chủ đầu tư hoặc file Word dán vào — hệ thống tự bóc tách Giá, Quy mô, Vị trí, Tiện ích!
          </p>
          <button type="button" class="st-btn st-btn-primary" id="accSmartPasteBtn">Mở trình Dán Nhanh</button>
        </div>

        <div class="accelerator-card">
          <div style="font-size:1.6rem;">🏗️</div>
          <h3 style="margin:0;color:var(--st-primary);">2. Khởi Tạo Từ 4 Mẫu Phân Khúc</h3>
          <p style="margin:0;font-size:0.88rem;color:var(--st-muted);flex:1;">
            Chọn khung Căn hộ cao cấp, Biệt thự ven sông, Nghỉ dưỡng biển hoặc Đất nền sổ đỏ — có sẵn thông số &amp; tiến độ mẫu.
          </p>
          <button type="button" class="st-btn st-btn-outline" id="accTemplateBtn">Chọn Mẫu Dự Án</button>
        </div>

        <div class="accelerator-card">
          <div style="font-size:1.6rem;">🎨</div>
          <h3 style="margin:0;color:var(--st-primary);">3. Đổi Thương Hiệu &amp; Bảng Màu</h3>
          <p style="margin:0;font-size:0.88rem;color:var(--st-muted);flex:1;">
            Thay Logo, Tên công ty, số Hotline/Zalo và chuyển đổi giữa 5 bảng màu BĐS hạng sang chỉ bằng 1 cú nhấp chuột.
          </p>
          <button type="button" class="st-btn st-btn-outline" id="accBrandBtn">Tùy chỉnh Thương hiệu</button>
        </div>
      </div>
    </div>

    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">Khách Hàng Đăng Ký Tư Vấn Gần Đây (Trên Trình Duyệt Này)</h2>
          <p class="st-subtitle">Để nhận khách hàng từ mọi thiết bị của khách truy cập, bạn có thể gắn thêm Link Webhook Google Sheets / Formspree ở mục Thương hiệu.</p>
        </div>
      </div>
      ${leads.length === 0 ? `
        <p style="color:var(--st-muted);margin:0;font-size:0.9rem;">Chưa có form thử nghiệm nào trên máy này. Bạn có thể mở bản Xem trước Website và gửi thử form nhận bảng giá!</p>
      ` : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead>
              <tr style="text-align:left;border-bottom:1px solid var(--st-border);color:var(--st-muted);">
                <th style="padding:10px;">Khách hàng</th>
                <th style="padding:10px;">Điện thoại / Zalo</th>
                <th style="padding:10px;">Dự án quan tâm</th>
                <th style="padding:10px;">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              ${leads.slice(0, 8).map((l) => `
                <tr style="border-bottom:1px solid #F0F3F1;">
                  <td style="padding:10px;font-weight:600;">${escapeHTML(l.fullName || '')}</td>
                  <td style="padding:10px;"><a href="https://zalo.me/${escapeHTML(String(l.phone || '').replace(/\D/g, ''))}" target="_blank" style="color:var(--st-primary);font-weight:600;">${escapeHTML(l.phone || '')}</a></td>
                  <td style="padding:10px;">${escapeHTML(l.project || '')}</td>
                  <td style="padding:10px;color:var(--st-muted);">${new Date(l.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  document.getElementById('dashOpenSmartPaste')?.addEventListener('click', openSmartPasteModal);
  document.getElementById('accSmartPasteBtn')?.addEventListener('click', openSmartPasteModal);
  document.getElementById('dashOpenTemplates')?.addEventListener('click', openTemplateModal);
  document.getElementById('accTemplateBtn')?.addEventListener('click', openTemplateModal);
  document.getElementById('accBrandBtn')?.addEventListener('click', () => switchTab('brand'));
}

/* ================= 2. QUẢN LÝ & TRÌNH KIẾN TẠO DỰ ÁN BĐS ================= */
function renderProjectsWorkspace(ws) {
  if (editingProjectId) {
    const proj = (siteData.projects || []).find((p) => p.id === editingProjectId);
    if (proj) {
      renderSingleProjectEditor(ws, proj);
      return;
    }
    editingProjectId = null;
  }

  const projects = siteData.projects || [];
  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">Danh Sách Dự Án Bất Động Sản (${projects.length})</h2>
          <p class="st-subtitle">Nhân bản dự án cũ trong 1 giây hoặc tạo mới từ văn bản Zalo / Mẫu chuẩn</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" class="st-btn st-btn-outline" id="projListSmartPasteBtn">⚡ Dán nhanh từ Zalo/Word</button>
          <button type="button" class="st-btn st-btn-primary" id="projListNewTplBtn">+ Tạo dự án mới</button>
        </div>
      </div>

      <div class="st-project-list">
        ${projects.map((p, idx) => `
          <div class="st-project-row">
            <img src="${escapeHTML(resolveAsset(p.heroImage))}" alt="${escapeHTML(p.name)}" />
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                <span style="padding:3px 10px;border-radius:999px;background:#E8F3EE;color:var(--st-primary);font-size:0.75rem;font-weight:700;">
                  ${escapeHTML(p.status)}
                </span>
                <span style="font-size:0.8rem;color:var(--st-muted);font-weight:600;">${escapeHTML(p.category)}</span>
                <span style="font-size:0.82rem;color:#A17C38;font-weight:700;">• ${escapeHTML(p.priceDisplay)}</span>
              </div>
              <h3 style="margin:0 0 4px;font-size:1.15rem;color:var(--st-primary);">${escapeHTML(p.name)}</h3>
              <div style="font-size:0.84rem;color:var(--st-muted);">📍 ${escapeHTML(p.locationShort || p.address || '')} • Đường dẫn: <code>#/du-an/${escapeHTML(p.slug)}</code></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;">
              ${idx > 0 ? `<button type="button" class="st-btn st-btn-outline st-btn-sm" data-move-up="${p.id}" title="Đưa lên đầu">↑</button>` : ''}
              <button type="button" class="st-btn st-btn-primary st-btn-sm" data-edit-proj="${p.id}">✏️ Chỉnh sửa</button>
              <button type="button" class="st-btn st-btn-outline st-btn-sm" data-preview-proj="${p.slug}">👁️ Xem</button>
              <button type="button" class="st-btn st-btn-outline st-btn-sm" data-dup-proj="${p.id}">📋 Nhân bản</button>
              <button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-proj="${p.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('projListSmartPasteBtn')?.addEventListener('click', openSmartPasteModal);
  document.getElementById('projListNewTplBtn')?.addEventListener('click', openTemplateModal);

  ws.querySelectorAll('[data-edit-proj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingProjectId = btn.getAttribute('data-edit-proj');
      activeProjectEditorTab = 'basic';
      renderWorkspace();
    });
  });

  ws.querySelectorAll('[data-preview-proj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      previewRoute = `#/du-an/${encodeURIComponent(btn.getAttribute('data-preview-proj'))}`;
      switchTab('preview');
    });
  });

  ws.querySelectorAll('[data-move-up]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-move-up');
      const idx = siteData.projects.findIndex((x) => x.id === id);
      if (idx > 0) {
        const [item] = siteData.projects.splice(idx, 1);
        siteData.projects.unshift(item);
        persistChanges('Đã đưa dự án lên vị trí đầu tiên!');
        renderWorkspace();
      }
    });
  });

  ws.querySelectorAll('[data-dup-proj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const orig = siteData.projects.find((x) => x.id === btn.getAttribute('data-dup-proj'));
      if (!orig) return;
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = `proj-${Date.now()}`;
      copy.name = `${orig.name} (Giai đoạn mới)`;
      copy.slug = `${orig.slug}-moi-${Date.now().toString(36).slice(-3)}`;
      siteData.projects.unshift(copy);
      editingProjectId = copy.id;
      activeProjectEditorTab = 'basic';
      persistChanges('Đã nhân bản dự án thành công!');
      renderWorkspace();
    });
  });

  ws.querySelectorAll('[data-del-proj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-proj');
      const target = siteData.projects.find((x) => x.id === id);
      if (!target) return;
      if (confirm(`Bạn chắc chắn muốn xóa dự án "${target.name}"?`)) {
        siteData.projects = siteData.projects.filter((x) => x.id !== id);
        persistChanges('Đã xóa dự án.');
        renderWorkspace();
      }
    });
  });
}

function renderSingleProjectEditor(ws, proj) {
  const tabs = [
    { key: 'basic', label: '1. Cơ bản & Ảnh bìa' },
    { key: 'specs', label: '2. Bảng thông số' },
    { key: 'location', label: '3. Vị trí & Bản đồ' },
    { key: 'amenities', label: '4. Tiện ích & Mặt bằng' },
    { key: 'gallery', label: '5. Chính sách & Thư viện ảnh' },
    { key: 'live', label: '6. Xem trước Landing Page' }
  ];

  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div>
          <button type="button" class="st-btn st-btn-outline st-btn-sm" id="backToProjectsListBtn" style="margin-bottom:8px;">
            ← Quay lại danh sách dự án
          </button>
          <h2 class="st-title">Đang biên tập: ${escapeHTML(proj.name)}</h2>
          <p class="st-subtitle">Mọi chỉnh sửa được lưu nháp tự động ngay khi bạn nhập liệu</p>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="./index.html?preview=draft#/du-an/${encodeURIComponent(proj.slug)}" target="_blank" class="st-btn st-btn-outline">
            ↗ Xem toàn màn hình
          </a>
          <button type="button" class="st-btn st-btn-publish" id="editorPublishNowBtn">🚀 Xuất bản lên GitHub</button>
        </div>
      </div>

      <div class="editor-tabs">
        ${tabs.map((t) => `
          <button type="button" class="editor-tab-btn ${activeProjectEditorTab === t.key ? 'active' : ''}" data-ed-tab="${t.key}">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <div id="projectEditorBody"></div>
    </div>
  `;

  document.getElementById('backToProjectsListBtn')?.addEventListener('click', () => {
    editingProjectId = null;
    renderWorkspace();
  });

  document.getElementById('editorPublishNowBtn')?.addEventListener('click', openPublishModal);

  ws.querySelectorAll('[data-ed-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeProjectEditorTab = btn.getAttribute('data-ed-tab');
      renderWorkspace();
    });
  });

  const body = document.getElementById('projectEditorBody');
  if (!body) return;

  if (activeProjectEditorTab === 'basic') renderProjTabBasic(body, proj);
  else if (activeProjectEditorTab === 'specs') renderProjTabSpecs(body, proj);
  else if (activeProjectEditorTab === 'location') renderProjTabLocation(body, proj);
  else if (activeProjectEditorTab === 'amenities') renderProjTabAmenities(body, proj);
  else if (activeProjectEditorTab === 'gallery') renderProjTabGalleryAndPolicy(body, proj);
  else if (activeProjectEditorTab === 'live') renderProjTabLive(body, proj);
}

function renderProjTabBasic(body, proj) {
  body.innerHTML = `
    <div class="st-grid-2">
      <div class="st-field">
        <label>Tên dự án BĐS *</label>
        <input type="text" id="edProjName" class="st-input" value="${escapeHTML(proj.name)}" />
      </div>
      <div class="st-field">
        <label>Đường dẫn chuẩn SEO (slug tự động)</label>
        <input type="text" id="edProjSlug" class="st-input" value="${escapeHTML(proj.slug)}" />
      </div>
    </div>

    <div class="st-grid-3">
      <div class="st-field">
        <label>Phân khúc BĐS</label>
        <select id="edProjCategory" class="st-select">
          ${['Căn hộ hạng sang', 'Biệt thự & Khu đô thị', 'Nghỉ dưỡng biển', 'Đất nền & Shophouse'].map((c) => `
            <option value="${c}" ${proj.category === c ? 'selected' : ''}>${c}</option>
          `).join('')}
        </select>
      </div>
      <div class="st-field">
        <label>Trạng thái mở bán</label>
        <select id="edProjStatus" class="st-select">
          ${['Đang mở bán', 'Sắp ra mắt', 'Đang triển khai', 'Đã bàn giao'].map((s) => `
            <option value="${s}" ${proj.status === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>
      <div class="st-field">
        <label>Giá hiển thị trên thẻ (VD: Từ 68 triệu/m²)</label>
        <input type="text" id="edProjPrice" class="st-input" value="${escapeHTML(proj.priceDisplay || '')}" />
      </div>
    </div>

    <div class="st-grid-3">
      <div class="st-field">
        <label>Giá trung bình 1 căn (Tỷ VNĐ — dùng cho bảng tính vay NH)</label>
        <input type="number" step="0.1" id="edProjNumPrice" class="st-input" value="${Number(proj.numericPriceBillion || 5.5)}" />
      </div>
      <div class="st-field">
        <label>Cơ cấu diện tích (VD: 58m² – 140m²)</label>
        <input type="text" id="edProjArea" class="st-input" value="${escapeHTML(proj.areaRange || '')}" />
      </div>
      <div class="st-field">
        <label>Khu vực ngắn gọn (VD: Phú Mỹ Hưng, Quận 7)</label>
        <input type="text" id="edProjLocShort" class="st-input" value="${escapeHTML(proj.locationShort || '')}" />
      </div>
    </div>

    <div class="st-field">
      <label>Câu Slogan cảm xúc của dự án</label>
      <input type="text" id="edProjTagline" class="st-input" value="${escapeHTML(proj.tagline || '')}" />
    </div>

    <div class="st-field">
      <label>Ảnh đại diện Phối cảnh lớn (Hero Image) — Kéo thả để tự động nén sang WebP</label>
      <div class="upload-dropzone" id="heroDropzone">
        <strong>📥 Kéo thả ảnh phối cảnh vào đây hoặc bấm để chọn ảnh từ máy</strong>
        <div style="font-size:0.82rem;color:var(--st-muted);margin-top:4px;">Tự động thu phóng chuẩn Full HD &amp; nén WebP siêu nhẹ cho GitHub</div>
        <input type="file" id="heroFileInput" accept="image/*" style="display:none;" />
      </div>
      <div class="img-preview-row">
        <img id="edHeroPreview" src="${escapeHTML(resolveAsset(proj.heroImage))}" alt="Hero" />
        <div style="flex:1;">
          <input type="text" id="edProjHeroUrl" class="st-input" value="${escapeHTML(proj.heroImage || '')}" placeholder="Hoặc dán link ảnh trực tiếp..." />
          <div id="heroSaveStats" style="font-size:0.8rem;color:var(--st-success);margin-top:4px;"></div>
        </div>
      </div>
    </div>

    <div class="st-field">
      <label>Giới thiệu tổng quan dự án</label>
      <textarea id="edProjSummary" class="st-textarea" rows="4">${escapeHTML(proj.summary || '')}</textarea>
    </div>

    <div class="st-field">
      <label>Điểm nhấn nổi bật (Mỗi dòng là 1 ý nổi bật có dấu ✓ trên trang dự án)</label>
      <textarea id="edProjHighlights" class="st-textarea" rows="5">${escapeHTML((proj.highlights || []).join('\n'))}</textarea>
    </div>
  `;

  const bindBasic = () => {
    proj.name = document.getElementById('edProjName').value;
    proj.slug = slugifyVN(document.getElementById('edProjSlug').value || proj.name);
    proj.category = document.getElementById('edProjCategory').value;
    proj.status = document.getElementById('edProjStatus').value;
    proj.priceDisplay = document.getElementById('edProjPrice').value;
    proj.numericPriceBillion = parseFloat(document.getElementById('edProjNumPrice').value) || 5;
    proj.areaRange = document.getElementById('edProjArea').value;
    proj.locationShort = document.getElementById('edProjLocShort').value;
    proj.tagline = document.getElementById('edProjTagline').value;
    proj.heroImage = document.getElementById('edProjHeroUrl').value;
    proj.summary = document.getElementById('edProjSummary').value;
    proj.highlights = document.getElementById('edProjHighlights').value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    persistChanges();
  };

  document.getElementById('edProjName')?.addEventListener('input', (e) => {
    document.getElementById('edProjSlug').value = slugifyVN(e.target.value);
    bindBasic();
  });

  ['edProjSlug', 'edProjCategory', 'edProjStatus', 'edProjPrice', 'edProjNumPrice', 'edProjArea', 'edProjLocShort', 'edProjTagline', 'edProjHeroUrl', 'edProjSummary', 'edProjHighlights'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', bindBasic);
    document.getElementById(id)?.addEventListener('change', bindBasic);
  });

  bindSingleImageUploader('heroDropzone', 'heroFileInput', { maxWidth: 1800, prefix: proj.slug || 'hero' }, async (optimized) => {
    await savePendingUpload(optimized);
    await refreshUploadResolver();
    proj.heroImage = optimized.publicUrl;
    document.getElementById('edProjHeroUrl').value = optimized.publicUrl;
    document.getElementById('edHeroPreview').src = optimized.dataUrl;
    document.getElementById('heroSaveStats').textContent =
      `✓ Đã tối ưu WebP: ${formatBytes(optimized.originalSize)} → ${formatBytes(optimized.optimizedSize)} (Giảm ${optimized.savedPercent}%)`;
    persistChanges('Đã tối ưu & gắn ảnh đại diện dự án!');
  });
}

function renderProjTabSpecs(body, proj) {
  proj.specs = proj.specs || [];
  body.innerHTML = `
    <p class="st-subtitle" style="margin-bottom:16px;">Bảng thông số hiển thị trang trọng bên cạnh phần Tổng quan dự án (Chủ đầu tư, Quy mô, Mật độ, Pháp lý, Bàn giao...)</p>
    <div id="specsRowsWrap" style="display:grid;gap:10px;margin-bottom:16px;">
      ${proj.specs.map((sp, i) => `
        <div style="display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px;align-items:center;">
          <input type="text" class="st-input" data-spec-label="${i}" value="${escapeHTML(sp.label)}" placeholder="Tên thông số (VD: Chủ đầu tư)" />
          <input type="text" class="st-input" data-spec-val="${i}" value="${escapeHTML(sp.value)}" placeholder="Giá trị (VD: Hưng Lộc Phát Luxury)" />
          <button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-spec="${i}">✕</button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="st-btn st-btn-outline" id="addSpecRowBtn">+ Thêm dòng thông số</button>
  `;

  body.querySelectorAll('[data-spec-label]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.specs[Number(inp.getAttribute('data-spec-label'))].label = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-spec-val]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.specs[Number(inp.getAttribute('data-spec-val'))].value = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-del-spec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      proj.specs.splice(Number(btn.getAttribute('data-del-spec')), 1);
      persistChanges();
      renderProjTabSpecs(body, proj);
    });
  });
  document.getElementById('addSpecRowBtn')?.addEventListener('click', () => {
    proj.specs.push({ label: 'Thông số mới', value: '' });
    persistChanges();
    renderProjTabSpecs(body, proj);
  });
}

function renderProjTabLocation(body, proj) {
  proj.location = proj.location || { description: '', mapQuery: '', mapEmbedUrl: '', connections: [] };
  const connLines = (proj.location.connections || [])
    .map((c) => `${c.time} | ${c.place} | ${c.detail || ''}`)
    .join('\n');

  body.innerHTML = `
    <div class="st-field">
      <label>Địa chỉ đầy đủ của dự án</label>
      <input type="text" id="edLocAddress" class="st-input" value="${escapeHTML(proj.address || '')}" />
    </div>
    <div class="st-field">
      <label>Mô tả lợi thế vị trí chiến lược</label>
      <textarea id="edLocDesc" class="st-textarea" rows="4">${escapeHTML(proj.location.description || '')}</textarea>
    </div>
    <div class="st-grid-2">
      <div class="st-field">
        <label>Từ khóa tự động tạo Bản đồ Google Maps (Không cần API Key!)</label>
        <input type="text" id="edMapQuery" class="st-input" value="${escapeHTML(proj.location.mapQuery || proj.address || '')}" placeholder="VD: Nguyen Luong Bang, Quan 7, Ho Chi Minh" />
      </div>
      <div class="st-field">
        <label>Hoặc Link Embed Google Maps riêng (để trống nếu dùng từ khóa bên trái)</label>
        <input type="text" id="edMapEmbed" class="st-input" value="${escapeHTML(proj.location.mapEmbedUrl || '')}" placeholder="https://www.google.com/maps/embed?pb=..." />
      </div>
    </div>
    <div class="st-field">
      <label>Kết nối ngoại khu theo phút (Mỗi dòng theo cú pháp: <code>Số phút | Địa điểm | Mô tả ngắn</code>)</label>
      <textarea id="edConnLines" class="st-textarea" rows="5">${escapeHTML(connLines)}</textarea>
    </div>
  `;

  const saveLoc = () => {
    proj.address = document.getElementById('edLocAddress').value;
    proj.location.description = document.getElementById('edLocDesc').value;
    proj.location.mapQuery = document.getElementById('edMapQuery').value;
    proj.location.mapEmbedUrl = document.getElementById('edMapEmbed').value;
    proj.location.connections = document.getElementById('edConnLines').value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [time = '05 phút', place = '', detail = ''] = line.split('|').map((s) => s.trim());
        return { time, place: place || line, detail };
      });
    persistChanges();
  };

  ['edLocAddress', 'edLocDesc', 'edMapQuery', 'edMapEmbed', 'edConnLines'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', saveLoc);
  });
}

function renderProjTabAmenities(body, proj) {
  proj.amenities = proj.amenities || [];
  proj.floorPlans = proj.floorPlans || [];

  const selectedTitles = new Set(proj.amenities.map((a) => a.title));

  body.innerHTML = `
    <h3 style="margin:0 0 8px;color:var(--st-primary);">A. Chọn Nhanh Tiện Ích Nội Khu Bằng 1 Cú Nhấp</h3>
    <p class="st-subtitle" style="margin-bottom:14px;">Bấm vào tiện ích bất kỳ bên dưới để thêm/bớt nhanh vào dự án:</p>

    <div class="amenity-picker-grid">
      ${AMENITY_LIBRARY.map((item, idx) => `
        <button type="button" class="amenity-chip ${selectedTitles.has(item.title) ? 'selected' : ''}" data-toggle-am="${idx}">
          <span>${escapeHTML(item.title)}</span>
          <span>${selectedTitles.has(item.title) ? '✓' : '+'}</span>
        </button>
      `).join('')}
    </div>

    <div style="display:grid;gap:12px;margin-bottom:28px;">
      ${proj.amenities.map((am, idx) => `
        <div style="padding:14px;border-radius:14px;border:1px solid var(--st-border);background:#FAFBFA;">
          <div style="display:grid;grid-template-columns:1fr 1.5fr auto;gap:10px;align-items:center;">
            <input type="text" class="st-input" data-am-title="${idx}" value="${escapeHTML(am.title)}" placeholder="Tên tiện ích" />
            <input type="text" class="st-input" data-am-desc="${idx}" value="${escapeHTML(am.desc || '')}" placeholder="Mô tả tiện ích mềm mại..." />
            <button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-am="${idx}">✕</button>
          </div>
        </div>
      `).join('')}
      <button type="button" class="st-btn st-btn-outline" id="addCustomAmenityBtn" style="width:fit-content;">+ Tự thêm tiện ích riêng</button>
    </div>

    <hr style="border:none;border-top:1px solid var(--st-border);margin:24px 0;" />

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div>
        <h3 style="margin:0;color:var(--st-primary);">B. Các Tab Sơ Đồ Mặt Bằng &amp; Thiết Kế Căn Hộ</h3>
        <p class="st-subtitle">Khách hàng có thể chuyển đổi qua lại giữa các mặt bằng và bấm phóng to nét căng trên Website</p>
      </div>
      <button type="button" class="st-btn st-btn-primary st-btn-sm" id="addFloorplanTabBtn">+ Thêm Tab Mặt Bằng</button>
    </div>

    <div style="display:grid;gap:16px;">
      ${proj.floorPlans.map((fp, idx) => `
        <div style="padding:16px;border-radius:16px;border:1px solid var(--st-border);background:#FFFFFF;">
          <div class="st-grid-3">
            <div class="st-field">
              <label>Tên Tab (VD: Căn 2PN Deluxe)</label>
              <input type="text" class="st-input" data-fp-title="${idx}" value="${escapeHTML(fp.title)}" />
            </div>
            <div class="st-field">
              <label>Diện tích</label>
              <input type="text" class="st-input" data-fp-area="${idx}" value="${escapeHTML(fp.area || '')}" />
            </div>
            <div class="st-field">
              <label>Thông số ngắn</label>
              <input type="text" class="st-input" data-fp-specs="${idx}" value="${escapeHTML(fp.specs || '')}" />
            </div>
          </div>
          <div class="img-preview-row">
            <img src="${escapeHTML(resolveAsset(fp.image))}" alt="${escapeHTML(fp.title)}" />
            <div style="flex:1;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input type="text" class="st-input" style="flex:1;" data-fp-img="${idx}" value="${escapeHTML(fp.image || '')}" />
              <label class="st-btn st-btn-outline st-btn-sm" style="cursor:pointer;">
                📤 Tải ảnh sơ đồ
                <input type="file" accept="image/*" data-fp-upload="${idx}" style="display:none;" />
              </label>
              <button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-fp="${idx}">Xóa Tab</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  body.querySelectorAll('[data-toggle-am]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const libItem = AMENITY_LIBRARY[Number(chip.getAttribute('data-toggle-am'))];
      const existingIdx = proj.amenities.findIndex((a) => a.title === libItem.title);
      if (existingIdx >= 0) proj.amenities.splice(existingIdx, 1);
      else proj.amenities.push({ ...libItem, image: '' });
      persistChanges();
      renderProjTabAmenities(body, proj);
    });
  });

  body.querySelectorAll('[data-am-title]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.amenities[Number(inp.getAttribute('data-am-title'))].title = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-am-desc]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.amenities[Number(inp.getAttribute('data-am-desc'))].desc = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-del-am]').forEach((btn) => {
    btn.addEventListener('click', () => {
      proj.amenities.splice(Number(btn.getAttribute('data-del-am')), 1);
      persistChanges();
      renderProjTabAmenities(body, proj);
    });
  });
  document.getElementById('addCustomAmenityBtn')?.addEventListener('click', () => {
    proj.amenities.push({ icon: 'sparkles', title: 'Tiện ích đặc quyền mới', desc: '', image: '' });
    persistChanges();
    renderProjTabAmenities(body, proj);
  });

  // Floor plan events
  body.querySelectorAll('[data-fp-title]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.floorPlans[Number(inp.getAttribute('data-fp-title'))].title = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-fp-area]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.floorPlans[Number(inp.getAttribute('data-fp-area'))].area = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-fp-specs]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.floorPlans[Number(inp.getAttribute('data-fp-specs'))].specs = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-fp-img]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.floorPlans[Number(inp.getAttribute('data-fp-img'))].image = inp.value;
      persistChanges();
    });
  });
  body.querySelectorAll('[data-fp-upload]').forEach((fileInp) => {
    fileInp.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const idx = Number(fileInp.getAttribute('data-fp-upload'));
      const opt = await optimizeImageFile(file, { maxWidth: 1920, prefix: `${proj.slug}-matbang` });
      await savePendingUpload(opt);
      await refreshUploadResolver();
      proj.floorPlans[idx].image = opt.publicUrl;
      persistChanges(`Đã nén sơ đồ mặt bằng (-${opt.savedPercent}%)!`);
      renderProjTabAmenities(body, proj);
    });
  });
  body.querySelectorAll('[data-del-fp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      proj.floorPlans.splice(Number(btn.getAttribute('data-del-fp')), 1);
      persistChanges();
      renderProjTabAmenities(body, proj);
    });
  });
  document.getElementById('addFloorplanTabBtn')?.addEventListener('click', () => {
    proj.floorPlans.push({
      id: `fp-${Date.now()}`,
      title: 'Mặt Bằng Căn Điển Hình',
      area: '78 m²',
      specs: '2 Phòng ngủ • 2 WC',
      image: './assets/images/floorplan-2br.svg'
    });
    persistChanges();
    renderProjTabAmenities(body, proj);
  });
}

function renderProjTabGalleryAndPolicy(body, proj) {
  proj.policies = proj.policies || { bankSupport: '', discountNote: '', milestones: [] };
  proj.gallery = proj.gallery || [];

  const milestoneText = (proj.policies.milestones || [])
    .map((m) => `${m.step} | ${m.percent} | ${m.title} | ${m.note || ''}`)
    .join('\n');

  body.innerHTML = `
    <h3 style="margin:0 0 12px;color:var(--st-primary);">A. Chính Sách Bán Hàng &amp; Tiến Độ Thanh Toán</h3>
    <div class="st-grid-2">
      <div class="st-field">
        <label>Chính sách Ngân hàng bảo lãnh &amp; Hỗ trợ lãi suất</label>
        <textarea id="edBankSupport" class="st-textarea" rows="3">${escapeHTML(proj.policies.bankSupport || '')}</textarea>
      </div>
      <div class="st-field">
        <label>Ưu đãi Chiết khấu &amp; Quà tặng mở bán</label>
        <textarea id="edDiscountNote" class="st-textarea" rows="3">${escapeHTML(proj.policies.discountNote || '')}</textarea>
      </div>
    </div>

    <div class="st-field">
      <label>Các đợt thanh toán (Mỗi dòng: <code>Đợt | Tỷ lệ % | Nội dung | Ghi chú</code>)</label>
      <textarea id="edMilestonesText" class="st-textarea" rows="5">${escapeHTML(milestoneText)}</textarea>
    </div>

    <hr style="border:none;border-top:1px solid var(--st-border);margin:24px 0;" />

    <h3 style="margin:0 0 8px;color:var(--st-primary);">B. Thư Viện Ảnh Dự Án — Kéo Thả Nhiều Ảnh Cùng Lúc (Batch WebP)</h3>
    <div class="upload-dropzone" id="galleryBatchDropzone" style="margin-bottom:18px;">
      <strong>📸 Kéo thả 5–15 ảnh phối cảnh / nhà mẫu vào đây cùng lúc</strong>
      <div style="font-size:0.82rem;color:var(--st-muted);margin-top:4px;">Tất cả ảnh được tự động nén sang WebP siêu mượt trong 1 lần thả</div>
      <input type="file" id="galleryBatchInput" accept="image/*" multiple style="display:none;" />
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;">
      ${proj.gallery.map((g, idx) => `
        <div style="border:1px solid var(--st-border);border-radius:14px;padding:10px;background:#FFFFFF;">
          <img src="${escapeHTML(resolveAsset(g.url))}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:8px;" />
          <input type="text" class="st-input" style="margin-bottom:8px;font-size:0.82rem;padding:8px 10px;" data-gal-cap="${idx}" value="${escapeHTML(g.caption || '')}" placeholder="Chú thích bức ảnh..." />
          <button type="button" class="st-btn st-btn-danger st-btn-sm" style="width:100%;" data-del-gal="${idx}">Xóa ảnh</button>
        </div>
      `).join('')}
    </div>
  `;

  const savePolicy = () => {
    proj.policies.bankSupport = document.getElementById('edBankSupport').value;
    proj.policies.discountNote = document.getElementById('edDiscountNote').value;
    proj.policies.milestones = document.getElementById('edMilestonesText').value
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, idx) => {
        const [step = `Đợt ${idx + 1}`, percent = '10%', title = '', note = ''] = l.split('|').map((s) => s.trim());
        return { step, percent, title: title || 'Thanh toán theo tiến độ', note };
      });
    persistChanges();
  };

  ['edBankSupport', 'edDiscountNote', 'edMilestonesText'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', savePolicy);
  });

  body.querySelectorAll('[data-gal-cap]').forEach((inp) => {
    inp.addEventListener('input', () => {
      proj.gallery[Number(inp.getAttribute('data-gal-cap'))].caption = inp.value;
      persistChanges();
    });
  });

  body.querySelectorAll('[data-del-gal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      proj.gallery.splice(Number(btn.getAttribute('data-del-gal')), 1);
      persistChanges();
      renderProjTabGalleryAndPolicy(body, proj);
    });
  });

  const dz = document.getElementById('galleryBatchDropzone');
  const inp = document.getElementById('galleryBatchInput');
  const handleBatchFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    showToast(`Đang nén tự động ${files.length} ảnh sang WebP...`);
    for (const file of files) {
      const opt = await optimizeImageFile(file, { maxWidth: 1600, prefix: `${proj.slug}-gal` });
      await savePendingUpload(opt);
      proj.gallery.push({
        url: opt.publicUrl,
        caption: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      });
    }
    await refreshUploadResolver();
    persistChanges(`Đã thêm & nén WebP ${files.length} ảnh vào thư viện!`);
    renderProjTabGalleryAndPolicy(body, proj);
  };

  dz?.addEventListener('click', () => inp?.click());
  dz?.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz?.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    handleBatchFiles(e.dataTransfer?.files);
  });
  inp?.addEventListener('change', (e) => handleBatchFiles(e.target.files));
}

function renderProjTabLive(body, proj) {
  const targetHash = `#/du-an/${encodeURIComponent(proj.slug)}`;
  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <span style="font-size:0.9rem;color:var(--st-muted);">Xem trực tiếp giao diện thực tế của dự án <strong>${escapeHTML(proj.name)}</strong> trước khi xuất bản:</span>
      <div style="display:flex;gap:8px;">
        <button type="button" class="st-btn ${previewDevice === 'desktop' ? 'st-btn-primary' : 'st-btn-outline'} st-btn-sm" id="projPrevDesktop">💻 Máy tính</button>
        <button type="button" class="st-btn ${previewDevice === 'mobile' ? 'st-btn-primary' : 'st-btn-outline'} st-btn-sm" id="projPrevMobile">📱 Điện thoại</button>
      </div>
    </div>
    <div class="preview-frame-shell">
      <iframe id="projInlineIframe" class="preview-iframe ${previewDevice === 'mobile' ? 'mobile' : ''}" src="./index.html?preview=draft${targetHash}"></iframe>
    </div>
  `;

  document.getElementById('projPrevDesktop')?.addEventListener('click', () => {
    previewDevice = 'desktop';
    renderProjTabLive(body, proj);
  });
  document.getElementById('projPrevMobile')?.addEventListener('click', () => {
    previewDevice = 'mobile';
    renderProjTabLive(body, proj);
  });
}

/* ================= 3. THƯƠNG HIỆU, BẢNG MÀU & HERO TRANG CHỦ ================= */
function renderBrandWorkspace(ws) {
  const { brand = {}, theme = {}, heroSlides = [], stats = [] } = siteData;

  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">1. Bảng Màu Thương Hiệu &amp; Độ Mềm Mại Giao Diện</h2>
          <p class="st-subtitle">Chọn nhanh 1 trong 5 phong cách phối màu BĐS hạng sang hoặc tự chọn màu riêng</p>
        </div>
      </div>

      <div class="preset-grid">
        ${Object.entries(THEME_PRESETS).map(([key, p]) => `
          <button type="button" class="preset-card ${theme.preset === key ? 'active' : ''}" data-preset="${key}">
            <div class="swatch-dots">
              <span class="swatch-dot" style="background:${p.primary};"></span>
              <span class="swatch-dot" style="background:${p.accent};"></span>
              <span class="swatch-dot" style="background:${p.surface};"></span>
            </div>
            <strong style="font-size:0.86rem;display:block;color:var(--st-ink);">${escapeHTML(p.name)}</strong>
          </button>
        `).join('')}
      </div>

      <div class="st-grid-3">
        <div class="st-field">
          <label>Màu chủ đạo thương hiệu</label>
          <input type="color" id="thPrimary" class="st-input" style="height:44px;padding:4px;" value="${escapeHTML(theme.primary || '#0E3A2F')}" />
        </div>
        <div class="st-field">
          <label>Màu nhấn sang trọng (Vàng / Đồng)</label>
          <input type="color" id="thAccent" class="st-input" style="height:44px;padding:4px;" value="${escapeHTML(theme.accent || '#C8A45D')}" />
        </div>
        <div class="st-field">
          <label>Màu nền kem ấm chủ đạo</label>
          <input type="color" id="thSurface" class="st-input" style="height:44px;padding:4px;" value="${escapeHTML(theme.surface || '#FAF8F4')}" />
        </div>
      </div>

      <div class="st-grid-2">
        <div class="st-field">
          <label>Độ bo góc mềm mại của Thẻ &amp; Khung ảnh</label>
          <select id="thRadius" class="st-select">
            <option value="soft" ${theme.radiusStyle === 'soft' ? 'selected' : ''}>Mềm mại tinh tế (26px — Khuyên dùng)</option>
            <option value="pill" ${theme.radiusStyle === 'pill' ? 'selected' : ''}>Đường cong hữu cơ nghệ thuật (34px)</option>
            <option value="classic" ${theme.radiusStyle === 'classic' ? 'selected' : ''}>Thanh lịch cổ điển (16px)</option>
          </select>
        </div>
        <div class="st-field">
          <label>Bộ Font chữ Tiếng Việt cao cấp</label>
          <select id="thFont" class="st-select">
            <option value="editorial" ${theme.fontStyle === 'editorial' ? 'selected' : ''}>Sang trọng Cổ điển (Playfair Display + Be Vietnam Pro)</option>
            <option value="artistic" ${theme.fontStyle === 'artistic' ? 'selected' : ''}>Nghệ thuật Resort (Cormorant Garamond + Plus Jakarta)</option>
            <option value="modern" ${theme.fontStyle === 'modern' ? 'selected' : ''}>Hiện đại Đô thị (Plus Jakarta Sans + Be Vietnam Pro)</option>
          </select>
        </div>
      </div>
    </div>

    <div class="st-card">
      <h2 class="st-title" style="margin-bottom:16px;">2. Nhận Diện Thương Hiệu, Logo, Hotline &amp; Zalo</h2>
      <div class="st-field">
        <label>Logo Thương Hiệu (Hỗ trợ SVG nét cao hoặc PNG/JPG tự nén WebP)</label>
        <div class="img-preview-row">
          <img id="brandLogoPreview" src="${escapeHTML(resolveAsset(brand.logoUrl))}" alt="Logo" style="width:64px;height:64px;object-fit:contain;" />
          <div style="flex:1;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="brLogoUrl" class="st-input" style="flex:1;" value="${escapeHTML(brand.logoUrl || '')}" />
            <label class="st-btn st-btn-outline" style="cursor:pointer;">
              📤 Tải Logo mới
              <input type="file" id="brLogoFile" accept="image/*" style="display:none;" />
            </label>
          </div>
        </div>
      </div>

      <div class="st-grid-2">
        <div class="st-field">
          <label>Tên Thương hiệu / Công ty BĐS</label>
          <input type="text" id="brName" class="st-input" value="${escapeHTML(brand.name || '')}" />
        </div>
        <div class="st-field">
          <label>Dòng chữ phụ dưới Logo</label>
          <input type="text" id="brSubtext" class="st-input" value="${escapeHTML(brand.logoSubtext || '')}" />
        </div>
      </div>

      <div class="st-field">
        <label>Khẩu hiệu thương hiệu (Tagline)</label>
        <input type="text" id="brTagline" class="st-input" value="${escapeHTML(brand.tagline || '')}" />
      </div>

      <div class="st-field">
        <label>Đoạn giới thiệu Chủ đầu tư / Sàn phân phối</label>
        <textarea id="brDesc" class="st-textarea" rows="3">${escapeHTML(brand.description || '')}</textarea>
      </div>

      <div class="st-grid-3">
        <div class="st-field">
          <label>Số Hotline hiển thị</label>
          <input type="text" id="brHotline" class="st-input" value="${escapeHTML(brand.hotline || '')}" />
        </div>
        <div class="st-field">
          <label>Số Zalo nhận khách (viết liền)</label>
          <input type="text" id="brZalo" class="st-input" value="${escapeHTML(brand.zalo || '')}" />
        </div>
        <div class="st-field">
          <label>Email liên hệ</label>
          <input type="email" id="brEmail" class="st-input" value="${escapeHTML(brand.email || '')}" />
        </div>
      </div>

      <div class="st-grid-2">
        <div class="st-field">
          <label>Địa chỉ Văn phòng / Trụ sở</label>
          <input type="text" id="brAddress" class="st-input" value="${escapeHTML(brand.address || '')}" />
        </div>
        <div class="st-field">
          <label>Link Webhook nhận khách hàng tự động (Google Sheets / Formspree — tùy chọn)</label>
          <input type="url" id="brWebhook" class="st-input" value="${escapeHTML(brand.leadWebhookUrl || '')}" placeholder="https://formspree.io/f/... hoặc Google Script URL" />
        </div>
      </div>
    </div>

    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">3. Các Slide Mở Đầu Trang Chủ (Hero Banner)</h2>
          <p class="st-subtitle">Trình chiếu các dự án tâm điểm ngay khi khách hàng vừa vào Website</p>
        </div>
        <button type="button" class="st-btn st-btn-outline st-btn-sm" id="addHeroSlideBtn">+ Thêm Slide mới</button>
      </div>

      <div style="display:grid;gap:16px;">
        ${heroSlides.map((sl, idx) => `
          <div style="padding:16px;border-radius:16px;border:1px solid var(--st-border);background:#FAFBFA;">
            <div class="st-grid-2">
              <div class="st-field">
                <label>Nhãn nổi bật phía trên</label>
                <input type="text" class="st-input" data-sl-badge="${idx}" value="${escapeHTML(sl.badge || '')}" />
              </div>
              <div class="st-field">
                <label>Liên kết tới dự án</label>
                <select class="st-select" data-sl-proj="${idx}">
                  ${(siteData.projects || []).map((p) => `<option value="${escapeHTML(p.slug)}" ${sl.projectSlug === p.slug ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="st-field">
              <label>Tiêu đề lớn Slide</label>
              <input type="text" class="st-input" data-sl-title="${idx}" value="${escapeHTML(sl.title || '')}" />
            </div>
            <div class="st-field">
              <label>Mô tả ngắn</label>
              <input type="text" class="st-input" data-sl-sub="${idx}" value="${escapeHTML(sl.subtitle || '')}" />
            </div>
            <div class="img-preview-row">
              <img src="${escapeHTML(resolveAsset(sl.image))}" alt="" />
              <div style="flex:1;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" class="st-input" style="flex:1;" data-sl-img="${idx}" value="${escapeHTML(sl.image || '')}" />
                <label class="st-btn st-btn-outline st-btn-sm" style="cursor:pointer;">
                  📤 Đổi ảnh Slide
                  <input type="file" accept="image/*" data-sl-upload="${idx}" style="display:none;" />
                </label>
                ${heroSlides.length > 1 ? `<button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-sl="${idx}">Xóa</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="st-card">
      <h2 class="st-title" style="margin-bottom:14px;">4. Con Số Bảo Chứng Uy Tín Trên Trang Chủ</h2>
      <div class="st-grid-2">
        ${stats.map((st, idx) => `
          <div style="padding:14px;border-radius:14px;border:1px solid var(--st-border);display:grid;gap:8px;">
            <div style="display:grid;grid-template-columns:110px 1fr;gap:8px;">
              <input type="text" class="st-input" data-st-val="${idx}" value="${escapeHTML(st.value)}" placeholder="22+" />
              <input type="text" class="st-input" data-st-lbl="${idx}" value="${escapeHTML(st.label)}" placeholder="Năm kinh nghiệm" />
            </div>
            <input type="text" class="st-input" data-st-note="${idx}" value="${escapeHTML(st.note || '')}" placeholder="Chú thích ngắn..." />
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Preset click
  ws.querySelectorAll('[data-preset]').forEach((card) => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-preset');
      const p = THEME_PRESETS[key];
      if (!p) return;
      siteData.theme = {
        ...siteData.theme,
        preset: key,
        primary: p.primary,
        primarySoft: p.primarySoft,
        accent: p.accent,
        accentSoft: p.accentSoft,
        surface: p.surface,
        surfaceAlt: p.surfaceAlt
      };
      persistChanges(`Đã áp dụng bảng màu: ${p.name}`);
      renderWorkspace();
    });
  });

  const saveBrandAndTheme = () => {
    siteData.theme.primary = document.getElementById('thPrimary').value;
    siteData.theme.primarySoft = siteData.theme.primary;
    siteData.theme.accent = document.getElementById('thAccent').value;
    siteData.theme.surface = document.getElementById('thSurface').value;
    siteData.theme.radiusStyle = document.getElementById('thRadius').value;
    siteData.theme.fontStyle = document.getElementById('thFont').value;

    siteData.brand.logoUrl = document.getElementById('brLogoUrl').value;
    siteData.brand.name = document.getElementById('brName').value;
    siteData.brand.logoSubtext = document.getElementById('brSubtext').value;
    siteData.brand.tagline = document.getElementById('brTagline').value;
    siteData.brand.description = document.getElementById('brDesc').value;
    siteData.brand.hotline = document.getElementById('brHotline').value;
    siteData.brand.zalo = document.getElementById('brZalo').value;
    siteData.brand.email = document.getElementById('brEmail').value;
    siteData.brand.address = document.getElementById('brAddress').value;
    siteData.brand.leadWebhookUrl = document.getElementById('brWebhook').value;
    persistChanges();
  };

  ['thPrimary', 'thAccent', 'thSurface', 'thRadius', 'thFont', 'brLogoUrl', 'brName', 'brSubtext', 'brTagline', 'brDesc', 'brHotline', 'brZalo', 'brEmail', 'brAddress', 'brWebhook'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', saveBrandAndTheme);
    document.getElementById(id)?.addEventListener('change', saveBrandAndTheme);
  });

  document.getElementById('brLogoFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const opt = await optimizeImageFile(file, { maxWidth: 512, prefix: 'logo' });
    await savePendingUpload(opt);
    await refreshUploadResolver();
    siteData.brand.logoUrl = opt.publicUrl;
    persistChanges('Đã cập nhật Logo thương hiệu!');
    renderWorkspace();
  });

  // Hero slides events
  ws.querySelectorAll('[data-sl-badge]').forEach((el) => el.addEventListener('input', () => {
    siteData.heroSlides[Number(el.getAttribute('data-sl-badge'))].badge = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-sl-proj]').forEach((el) => el.addEventListener('change', () => {
    siteData.heroSlides[Number(el.getAttribute('data-sl-proj'))].projectSlug = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-sl-title]').forEach((el) => el.addEventListener('input', () => {
    siteData.heroSlides[Number(el.getAttribute('data-sl-title'))].title = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-sl-sub]').forEach((el) => el.addEventListener('input', () => {
    siteData.heroSlides[Number(el.getAttribute('data-sl-sub'))].subtitle = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-sl-img]').forEach((el) => el.addEventListener('input', () => {
    siteData.heroSlides[Number(el.getAttribute('data-sl-img'))].image = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-sl-upload]').forEach((inp) => inp.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = Number(inp.getAttribute('data-sl-upload'));
    const opt = await optimizeImageFile(file, { maxWidth: 1920, prefix: 'hero-slide' });
    await savePendingUpload(opt);
    await refreshUploadResolver();
    siteData.heroSlides[idx].image = opt.publicUrl;
    persistChanges('Đã cập nhật ảnh Hero Slide!');
    renderWorkspace();
  }));
  ws.querySelectorAll('[data-del-sl]').forEach((btn) => btn.addEventListener('click', () => {
    siteData.heroSlides.splice(Number(btn.getAttribute('data-del-sl')), 1);
    persistChanges();
    renderWorkspace();
  }));
  document.getElementById('addHeroSlideBtn')?.addEventListener('click', () => {
    const firstProj = siteData.projects?.[0];
    siteData.heroSlides.push({
      id: `slide-${Date.now()}`,
      badge: 'DỰ ÁN MỚI RA MẮT',
      title: firstProj?.name || 'Tuyệt Tác Bất Động Sản Mới',
      subtitle: firstProj?.tagline || '',
      image: firstProj?.heroImage || './assets/images/hero-emerald-residences.jpg',
      ctaPrimaryText: 'Khám phá ngay',
      projectSlug: firstProj?.slug || '',
      highlightMetric: 'Ưu đãi mở bán đợt 1'
    });
    persistChanges('Đã thêm Slide mới!');
    renderWorkspace();
  });

  // Stats events
  ws.querySelectorAll('[data-st-val]').forEach((el) => el.addEventListener('input', () => {
    siteData.stats[Number(el.getAttribute('data-st-val'))].value = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-st-lbl]').forEach((el) => el.addEventListener('input', () => {
    siteData.stats[Number(el.getAttribute('data-st-lbl'))].label = el.value;
    persistChanges();
  }));
  ws.querySelectorAll('[data-st-note]').forEach((el) => el.addEventListener('input', () => {
    siteData.stats[Number(el.getAttribute('data-st-note'))].note = el.value;
    persistChanges();
  }));
}

/* ================= 4. QUẢN LÝ TIN TỨC & THỊ TRƯỜNG ================= */
function renderNewsWorkspace(ws) {
  siteData.news = siteData.news || [];

  if (editingNewsId) {
    const item = siteData.news.find((n) => n.id === editingNewsId);
    if (item) {
      ws.innerHTML = `
        <div class="st-card">
          <button type="button" class="st-btn st-btn-outline st-btn-sm" id="backNewsListBtn" style="margin-bottom:12px;">← Quay lại danh sách bài viết</button>
          <h2 class="st-title" style="margin-bottom:18px;">Soạn Thảo Bài Viết Tin Tức / Tiến Độ</h2>

          <div class="st-grid-2">
            <div class="st-field">
              <label>Tiêu đề bài viết *</label>
              <input type="text" id="nwTitle" class="st-input" value="${escapeHTML(item.title)}" />
            </div>
            <div class="st-field">
              <label>Đường dẫn bài viết (slug)</label>
              <input type="text" id="nwSlug" class="st-input" value="${escapeHTML(item.slug)}" />
            </div>
          </div>

          <div class="st-grid-3">
            <div class="st-field">
              <label>Chuyên mục</label>
              <select id="nwCategory" class="st-select">
                ${['Phân tích thị trường', 'Sự kiện & Tiến độ', 'Kiến thức đầu tư', 'Tin tức Chủ đầu tư'].map((c) => `
                  <option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            <div class="st-field">
              <label>Ngày đăng</label>
              <input type="date" id="nwDate" class="st-input" value="${escapeHTML(item.date || new Date().toISOString().slice(0, 10))}" />
            </div>
            <div class="st-field">
              <label>Dự án liên quan (hiển thị cuối bài)</label>
              <select id="nwProj" class="st-select">
                ${(siteData.projects || []).map((p) => `<option value="${escapeHTML(p.slug)}" ${item.relatedProjectSlug === p.slug ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="st-field">
            <label>Ảnh đại diện bài viết</label>
            <div class="img-preview-row">
              <img id="nwImgPrev" src="${escapeHTML(resolveAsset(item.image))}" alt="" />
              <div style="flex:1;display:flex;gap:8px;align-items:center;">
                <input type="text" id="nwImgUrl" class="st-input" style="flex:1;" value="${escapeHTML(item.image || '')}" />
                <label class="st-btn st-btn-outline st-btn-sm" style="cursor:pointer;">
                  📤 Tải ảnh lên
                  <input type="file" id="nwImgFile" accept="image/*" style="display:none;" />
                </label>
              </div>
            </div>
          </div>

          <div class="st-field">
            <label>Tóm tắt ngắn (hiển thị ngoài thẻ tin tức)</label>
            <textarea id="nwExcerpt" class="st-textarea" rows="2">${escapeHTML(item.excerpt || '')}</textarea>
          </div>

          <div class="st-field">
            <label>Nội dung chi tiết bài viết</label>
            <textarea id="nwContent" class="st-textarea" rows="10">${escapeHTML(item.content || '')}</textarea>
          </div>
        </div>
      `;

      document.getElementById('backNewsListBtn')?.addEventListener('click', () => {
        editingNewsId = null;
        renderWorkspace();
      });

      const saveNw = () => {
        item.title = document.getElementById('nwTitle').value;
        item.slug = slugifyVN(document.getElementById('nwSlug').value || item.title);
        item.category = document.getElementById('nwCategory').value;
        item.date = document.getElementById('nwDate').value;
        item.relatedProjectSlug = document.getElementById('nwProj').value;
        item.image = document.getElementById('nwImgUrl').value;
        item.excerpt = document.getElementById('nwExcerpt').value;
        item.content = document.getElementById('nwContent').value;
        persistChanges();
      };

      document.getElementById('nwTitle')?.addEventListener('input', (e) => {
        document.getElementById('nwSlug').value = slugifyVN(e.target.value);
        saveNw();
      });
      ['nwSlug', 'nwCategory', 'nwDate', 'nwProj', 'nwImgUrl', 'nwExcerpt', 'nwContent'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', saveNw);
        document.getElementById(id)?.addEventListener('change', saveNw);
      });

      document.getElementById('nwImgFile')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const opt = await optimizeImageFile(file, { maxWidth: 1440, prefix: 'news' });
        await savePendingUpload(opt);
        await refreshUploadResolver();
        item.image = opt.publicUrl;
        persistChanges('Đã tối ưu & gắn ảnh bìa bài viết!');
        renderWorkspace();
      });
      return;
    }
    editingNewsId = null;
  }

  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">Tin Tức Thị Trường &amp; Sự Kiện Mở Bán (${siteData.news.length})</h2>
          <p class="st-subtitle">Giúp Website luôn tươi mới, tăng uy tín SEO và điều hướng khách hàng về các dự án đang mở bán</p>
        </div>
        <button type="button" class="st-btn st-btn-primary" id="createNewsBtn">+ Viết bài mới</button>
      </div>

      <div class="st-project-list">
        ${siteData.news.map((n) => `
          <div class="st-project-row">
            <img src="${escapeHTML(resolveAsset(n.image))}" alt="${escapeHTML(n.title)}" />
            <div>
              <div style="font-size:0.78rem;color:#A17C38;font-weight:700;">${escapeHTML(n.category)} • ${escapeHTML(n.date)}</div>
              <h3 style="margin:4px 0;font-size:1.08rem;color:var(--st-primary);">${escapeHTML(n.title)}</h3>
              <div style="font-size:0.85rem;color:var(--st-muted);">${escapeHTML(n.excerpt || '')}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" class="st-btn st-btn-primary st-btn-sm" data-edit-nw="${n.id}">✏️ Sửa</button>
              <button type="button" class="st-btn st-btn-danger st-btn-sm" data-del-nw="${n.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('createNewsBtn')?.addEventListener('click', () => {
    const newArticle = {
      id: `news-${Date.now()}`,
      slug: `tin-tuc-moi-${Date.now().toString(36).slice(-4)}`,
      title: 'Cập nhật tiến độ & Chính sách ưu đãi mới nhất',
      category: 'Sự kiện & Tiến độ',
      date: new Date().toISOString().slice(0, 10),
      readTime: '4 phút đọc',
      featured: false,
      relatedProjectSlug: siteData.projects?.[0]?.slug || '',
      image: siteData.projects?.[0]?.heroImage || './assets/images/hero-emerald-residences.jpg',
      excerpt: 'Cập nhật những hình ảnh thực tế và ưu đãi hấp dẫn dành cho khách hàng giao dịch trong tháng.',
      content: 'Nội dung chi tiết bài viết...'
    };
    siteData.news.unshift(newArticle);
    editingNewsId = newArticle.id;
    persistChanges('Đã tạo bài viết mới!');
    renderWorkspace();
  });

  ws.querySelectorAll('[data-edit-nw]').forEach((btn) => btn.addEventListener('click', () => {
    editingNewsId = btn.getAttribute('data-edit-nw');
    renderWorkspace();
  }));

  ws.querySelectorAll('[data-del-nw]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-del-nw');
    if (confirm('Xóa bài viết tin tức này?')) {
      siteData.news = siteData.news.filter((x) => x.id !== id);
      persistChanges('Đã xóa bài viết.');
      renderWorkspace();
    }
  }));
}

/* ================= 5. XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW) ================= */
function renderLivePreviewWorkspace(ws) {
  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h2 class="st-title">Xem Trước Trực Tiếp Giao Diện</h2>
          <select id="previewRouteSelect" class="st-select" style="width:auto;min-width:260px;">
            <option value="#/" ${previewRoute === '#/' ? 'selected' : ''}>🏠 Trang chủ tổng thể</option>
            ${(siteData.projects || []).map((p) => {
              const r = `#/du-an/${encodeURIComponent(p.slug)}`;
              return `<option value="${r}" ${previewRoute === r ? 'selected' : ''}>🏢 Dự án: ${escapeHTML(p.name)}</option>`;
            }).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="st-btn ${previewDevice === 'desktop' ? 'st-btn-primary' : 'st-btn-outline'} st-btn-sm" id="btnPrevDesktop">💻 Desktop</button>
          <button type="button" class="st-btn ${previewDevice === 'mobile' ? 'st-btn-primary' : 'st-btn-outline'} st-btn-sm" id="btnPrevMobile">📱 Điện thoại</button>
          <a href="./index.html?preview=draft${previewRoute}" target="_blank" class="st-btn st-btn-outline st-btn-sm">↗ Mở Tab mới</a>
        </div>
      </div>

      <div class="preview-frame-shell">
        <iframe id="mainPreviewIframe" class="preview-iframe ${previewDevice === 'mobile' ? 'mobile' : ''}" src="./index.html?preview=draft${previewRoute}"></iframe>
      </div>
    </div>
  `;

  document.getElementById('previewRouteSelect')?.addEventListener('change', (e) => {
    previewRoute = e.target.value;
    renderLivePreviewWorkspace(ws);
  });
  document.getElementById('btnPrevDesktop')?.addEventListener('click', () => {
    previewDevice = 'desktop';
    renderLivePreviewWorkspace(ws);
  });
  document.getElementById('btnPrevMobile')?.addEventListener('click', () => {
    previewDevice = 'mobile';
    renderLivePreviewWorkspace(ws);
  });
}

/* ================= 6. KẾT NỐI GITHUB & XUẤT BẢN 1-CLICK ================= */
function renderPublishWorkspace(ws) {
  const cfg = getGitHubConfig();

  ws.innerHTML = `
    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h2 class="st-title">🚀 Kết Nối GitHub — Xuất Bản 1-Click Không Cần <code>git push</code></h2>
          <p class="st-subtitle">Chỉ cần cài đặt 1 lần duy nhất. Từ lần sau, bạn thêm dự án ở bất kỳ đâu (kể cả trên điện thoại) và bấm Xuất bản là Website tự động cập nhật!</p>
        </div>
      </div>

      <div class="st-grid-3">
        <div class="st-field">
          <label>GitHub Username / Tổ chức *</label>
          <input type="text" id="ghOwner" class="st-input" value="${escapeHTML(cfg.owner)}" placeholder="VD: quangbds" />
        </div>
        <div class="st-field">
          <label>Tên Repository trên GitHub *</label>
          <input type="text" id="ghRepo" class="st-input" value="${escapeHTML(cfg.repo)}" placeholder="VD: bds-luxury" />
        </div>
        <div class="st-field">
          <label>Nhánh chính (Branch)</label>
          <input type="text" id="ghBranch" class="st-input" value="${escapeHTML(cfg.branch || 'main')}" placeholder="main" />
        </div>
      </div>

      <div class="st-field">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <label>GitHub Personal Access Token (Lưu bảo mật riêng trên trình duyệt của bạn, không bao giờ đẩy lên mạng) *</label>
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="font-size:0.82rem;color:var(--st-primary);font-weight:700;">
            ↗ Mở trang tạo Fine-grained Token trên GitHub
          </a>
        </div>
        <input type="password" id="ghToken" class="st-input" value="${escapeHTML(cfg.token)}" placeholder="github_pat_..." />
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;">
        <button type="button" class="st-btn st-btn-primary" id="saveAndVerifyGhBtn">🔍 Lưu &amp; Kiểm tra kết nối</button>
        <button type="button" class="st-btn st-btn-outline" id="enablePagesApiBtn">⚡ Tự động bật GitHub Pages (Workflow)</button>
        <button type="button" class="st-btn st-btn-outline" id="pullLatestGhBtn">⬇️ Tải dữ liệu từ GitHub về App</button>
        <button type="button" class="st-btn st-btn-publish" id="publishFromTabBtn">🚀 Xuất bản tất cả lên Website ngay</button>
      </div>

      <div id="ghConnectionResult" style="display:none;margin-top:16px;padding:16px;border-radius:14px;background:#EDF5F1;font-size:0.9rem;"></div>
    </div>

    <div class="st-grid-2">
      <div class="st-card">
        <h3 class="st-title" style="font-size:1.18rem;margin-bottom:10px;">📖 Hướng Dẫn 3 Bước Tạo Token Chuẩn Bảo Mật</h3>
        <ol style="margin:0;padding-left:20px;font-size:0.9rem;color:var(--st-muted);display:grid;gap:8px;">
          <li>Bấm vào link <strong>Mở trang tạo Fine-grained Token</strong> phía trên, đặt tên bất kỳ (VD: <code>BDS Studio</code>).</li>
          <li>Ở mục <strong>Repository access</strong>, chọn <em>Only select repositories</em> rồi chọn đúng repo Website BĐS của bạn.</li>
          <li>Ở mục <strong>Permissions → Repository permissions</strong>, bật quyền <strong>Contents: Read and write</strong> (và <strong>Pages: Read and write</strong> nếu muốn bật Pages tự động), bấm <em>Generate token</em> rồi dán vào ô bên trên.</li>
        </ol>
      </div>

      <div class="st-card">
        <h3 class="st-title" style="font-size:1.18rem;margin-bottom:10px;">💾 Sao Lưu &amp; Khôi Phục Dữ Liệu (.json)</h3>
        <p class="st-subtitle" style="margin-bottom:16px;">Bạn luôn có thể tải toàn bộ dữ liệu dự án ra file JSON để lưu dự phòng hoặc chuyển sang máy tính khác.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <button type="button" class="st-btn st-btn-outline" id="exportJsonBtn">⬇️ Tải file site-data.json</button>
          <label class="st-btn st-btn-outline" style="cursor:pointer;">
            📂 Nhập từ file .json
            <input type="file" id="importJsonInput" accept="application/json,.json" style="display:none;" />
          </label>
        </div>
      </div>
    </div>

    <div class="st-card">
      <div class="st-card-header">
        <div>
          <h3 class="st-title" style="font-size:1.18rem;">🔐 Bảo Mật Đăng Nhập &amp; Khóa Mã Hóa AES-256</h3>
          <p class="st-subtitle">
            ${hasSavedVault()
              ? 'Mã GitHub Token đang được mã hóa chuẩn <strong>AES-256-GCM</strong> bằng mật khẩu riêng của bạn và tự động khóa sau 30 phút không thao tác.'
              : 'Bạn đang ở chế độ Nội bộ. Hãy đặt mật khẩu bên dưới để mã hóa và lưu khóa kết nối GitHub an toàn trên thiết bị này.'}
          </p>
        </div>
        <button type="button" class="st-btn st-btn-outline st-btn-lock st-btn-sm" id="lockFromSecurityCardBtn">
          🔒 Khóa màn hình ngay
        </button>
      </div>

      ${hasSavedVault() ? `
        <div class="st-grid-3" style="align-items:end;">
          <div class="st-field" style="margin-bottom:0;">
            <label>Mật khẩu mở khóa hiện tại *</label>
            <input type="password" id="secCurrentPass" class="st-input" placeholder="Nhập mật khẩu hiện tại..." />
          </div>
          <div class="st-field" style="margin-bottom:0;">
            <label>Mật khẩu mở khóa mới *</label>
            <input type="password" id="secNewPass" class="st-input" placeholder="Tối thiểu 4 ký tự..." />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="st-btn st-btn-primary" id="changeStudioPassBtn">🔑 Đổi mật khẩu</button>
            <button type="button" class="st-btn st-btn-danger" id="wipeSavedVaultBtn" title="Dùng khi đăng nhập nhờ trên máy người khác">🗑️ Xóa khóa trên máy này</button>
          </div>
        </div>
      ` : `
        <div class="st-grid-2" style="align-items:end;">
          <div class="st-field" style="margin-bottom:0;">
            <label>Đặt Mật khẩu mở khóa nhanh cho thiết bị này *</label>
            <input type="password" id="secInitialPass" class="st-input" placeholder="Tối thiểu 4 ký tự (dùng để mở khóa từ lần sau)..." />
          </div>
          <div>
            <button type="button" class="st-btn st-btn-primary" id="sealInitialVaultBtn">🛡️ Xác thực GitHub &amp; Bật khóa mật khẩu</button>
          </div>
        </div>
      `}
      <div id="secActionResult" style="display:none;margin-top:14px;padding:12px 14px;border-radius:12px;font-size:0.88rem;"></div>
    </div>
  `;

  const readCfgInputs = () => {
    const next = {
      owner: document.getElementById('ghOwner').value,
      repo: document.getElementById('ghRepo').value,
      branch: document.getElementById('ghBranch').value || 'main',
      token: document.getElementById('ghToken').value
    };
    saveGitHubConfig(next);
    return getGitHubConfig();
  };

  const resultBox = document.getElementById('ghConnectionResult');
  const showResult = (html, isErr = false) => {
    if (!resultBox) return;
    resultBox.style.display = 'block';
    resultBox.style.background = isErr ? '#FDF2F2' : '#EDF5F1';
    resultBox.style.color = isErr ? '#A62626' : '#0E3A2F';
    resultBox.innerHTML = html;
  };

  document.getElementById('saveAndVerifyGhBtn')?.addEventListener('click', async () => {
    try {
      const next = readCfgInputs();
      showResult('⏳ Đang kiểm tra quyền Quản trị viên trên kho lưu trữ GitHub...');
      const info = await verifyGitHubConnection(next);
      await saveGitHubConfig({
        ...next,
        branch: info.branch || next.branch,
        adminLogin: info.adminLogin,
        adminAvatar: info.adminAvatar
      });
      syncAdminSessionBadge();
      showResult(`
        <strong>✓ Xác thực quyền Quản trị thành công cho <code>@${escapeHTML(info.adminLogin)}</code> trên <code>${escapeHTML(info.fullName)}</code>!</strong><br/>
        • Địa chỉ Website GitHub Pages: <a href="${escapeHTML(info.pagesUrl)}" target="_blank" style="font-weight:700;color:var(--st-primary);">${escapeHTML(info.pagesUrl)}</a>
        ${info.pagesEnabled ? '(Đã kích hoạt)' : '(Chưa bật — hãy bấm nút "Tự động bật GitHub Pages" kế bên)'}<br/>
        • Cổng quản trị bảo mật trực tuyến: <code>${escapeHTML(info.pagesUrl)}studio.html</code>
      `);
    } catch (err) {
      showResult(`✕ Không thể kết nối: ${escapeHTML(err.message)}`, true);
    }
  });

  const secBox = document.getElementById('secActionResult');
  const showSecMsg = (msg, isErr = false) => {
    if (!secBox) return;
    secBox.style.display = 'block';
    secBox.style.background = isErr ? '#FDF2F2' : '#EDF5F1';
    secBox.style.color = isErr ? '#A62626' : '#0E3A2F';
    secBox.innerHTML = msg;
  };

  document.getElementById('lockFromSecurityCardBtn')?.addEventListener('click', () => {
    lockAndShowGate('🔒 Đã khóa màn hình quản trị BDS Studio an toàn.');
  });

  document.getElementById('changeStudioPassBtn')?.addEventListener('click', async () => {
    try {
      const currentPassword = document.getElementById('secCurrentPass')?.value || '';
      const newPassword = document.getElementById('secNewPass')?.value || '';
      await changeVaultPassword({ currentPassword, newPassword });
      document.getElementById('secCurrentPass').value = '';
      document.getElementById('secNewPass').value = '';
      showSecMsg('✓ Đã cập nhật mật khẩu mở khóa và mã hóa lại khóa AES-256 thành công!');
      showToast('Đã đổi mật khẩu mở khóa Studio!');
    } catch (err) {
      showSecMsg(`✕ ${escapeHTML(err.message)}`, true);
    }
  });

  document.getElementById('wipeSavedVaultBtn')?.addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ khóa kết nối đã lưu trên trình duyệt này và đăng xuất ngay? (Hãy dùng khi bạn đăng nhập nhờ trên máy người khác)')) {
      return;
    }
    resetSavedVault();
    lockAndShowGate('🗑️ Đã xóa sạch khóa đăng nhập khỏi trình duyệt này.');
  });

  document.getElementById('sealInitialVaultBtn')?.addEventListener('click', async () => {
    try {
      const next = readCfgInputs();
      const pass = document.getElementById('secInitialPass')?.value || '';
      showSecMsg('⏳ Đang xác thực quyền chủ sở hữu GitHub và mã hóa khóa AES-256...');
      await setupAdminVaultAndLogin({
        ...next,
        password: pass,
        boundRepo: detectHostedRepoBinding(publishedMetaSource || siteData)
      });
      syncAdminSessionBadge();
      renderPublishTab(ws);
      showToast('🛡️ Đã bật khóa bảo mật mật khẩu cho BDS Studio!');
    } catch (err) {
      showSecMsg(`✕ ${escapeHTML(err.message)}`, true);
    }
  });

  document.getElementById('enablePagesApiBtn')?.addEventListener('click', async () => {
    try {
      const next = readCfgInputs();
      showResult('⏳ Đang cấu hình GitHub Pages sang chế độ GitHub Actions...');
      await enableGitHubPagesWorkflow(next);
      showResult('✓ Đã bật chế độ GitHub Pages (GitHub Actions Workflow) thành công!');
    } catch (err) {
      showResult(`Lưu ý: ${escapeHTML(err.message)} (Bạn có thể vào Settings → Pages trên GitHub chọn Source: GitHub Actions)`, true);
    }
  });

  document.getElementById('pullLatestGhBtn')?.addEventListener('click', async () => {
    try {
      const next = readCfgInputs();
      showResult('⏳ Đang tải dữ liệu mới nhất từ GitHub...');
      const remoteData = await pullSiteDataFromGitHub(next);
      siteData = remoteData;
      markDraftClean(siteData);
      await clearPendingUploads();
      await refreshUploadResolver();
      updateTopStatusUI();
      syncSidebarCounters();
      showResult('✓ Đã đồng bộ dữ liệu mới nhất từ GitHub về BDS Studio!');
    } catch (err) {
      showResult(`✕ Lỗi tải dữ liệu: ${escapeHTML(err.message)}`, true);
    }
  });

  document.getElementById('publishFromTabBtn')?.addEventListener('click', () => {
    readCfgInputs();
    openPublishModal();
  });

  document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site-data.json';
    a.click();
    showToast('Đã tải xuống file site-data.json!');
  });

  document.getElementById('importJsonInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.projects || !parsed.brand) throw new Error('File JSON không đúng cấu trúc site-data.json');
      siteData = parsed;
      persistChanges('Đã khôi phục dữ liệu từ file JSON!');
      renderWorkspace();
    } catch (err) {
      alert(`Không thể đọc file: ${err.message}`);
    }
  });
}

/* ================= CÁC MODAL TỐI ƯU HÓA QUY TRÌNH ================= */
function openSmartPasteModal() {
  document.getElementById('smartPasteModal')?.classList.add('open');
}

function openTemplateModal() {
  const modal = document.getElementById('templatePickerModal');
  const container = document.getElementById('templateCardsContainer');
  if (container) {
    container.innerHTML = Object.entries(PROJECT_TEMPLATES).map(([key, tpl]) => `
      <div style="padding:16px;border-radius:16px;border:1px solid var(--st-border);background:#FAFBFA;display:flex;flex-direction:column;gap:8px;">
        <strong style="color:var(--st-primary);font-size:1.02rem;">${escapeHTML(tpl.label)}</strong>
        <span style="font-size:0.83rem;color:var(--st-muted);">${escapeHTML(tpl.areaRange)} • ${escapeHTML(tpl.priceDisplay)}</span>
        <button type="button" class="st-btn st-btn-primary st-btn-sm" style="margin-top:auto;" data-pick-tpl="${key}">
          Khởi tạo từ mẫu này →
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-pick-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-pick-tpl');
        const tpl = PROJECT_TEMPLATES[key];
        const rawName = document.getElementById('newTplProjectName')?.value?.trim() || `Dự Án ${tpl.label} Mới`;
        const newProj = {
          id: `proj-${Date.now()}`,
          slug: slugifyVN(rawName) || `du-an-${Date.now()}`,
          name: rawName,
          category: tpl.category,
          status: tpl.status,
          featured: true,
          tagline: tpl.tagline,
          priceDisplay: tpl.priceDisplay,
          numericPriceBillion: tpl.numericPriceBillion,
          areaRange: tpl.areaRange,
          locationShort: 'TP. Hồ Chí Minh',
          address: 'Trung tâm Khu đô thị mới, TP. Hồ Chí Minh',
          heroImage: tpl.heroImage,
          summary: `${rawName} được kiến tạo theo chuẩn mực sinh thái hiện đại, hài hòa giữa kiến trúc tinh tế, tiện ích nội khu đồng bộ và tiềm năng gia tăng giá trị bền vững.`,
          highlights: [...tpl.highlights],
          specs: tpl.specs.map((s) => ({ ...s })),
          location: {
            description: `Tọa lạc tại tâm điểm kết nối giao thông huyết mạch, từ ${rawName} cư dân thuận tiện tiếp cận chuỗi tiện ích thương mại, trường học và bệnh viện quốc tế.`,
            mapQuery: 'Ho Chi Minh City',
            mapEmbedUrl: '',
            connections: [
              { time: '05 phút', place: 'Trung tâm thương mại & Trường quốc tế', detail: 'Tiện ích hiện hữu liền kề' },
              { time: '12 phút', place: 'Trung tâm tài chính hành chính', detail: 'Đại lộ kết nối thông suốt' }
            ]
          },
          amenities: tpl.amenities.map((a) => ({ ...a, image: '' })),
          floorPlans: [
            {
              id: `fp-${Date.now()}`,
              title: 'Mặt Bằng Tổng Thể',
              area: 'Quy hoạch đồng bộ',
              specs: tpl.areaRange,
              image: './assets/images/floorplan-master.svg'
            }
          ],
          policies: {
            bankSupport: 'Ngân hàng đối tác bảo lãnh & hỗ trợ vay 70%, lãi suất 0% trong 24 tháng.',
            discountNote: 'Chiết khấu thanh toán sớm hấp dẫn dành cho khách hàng đăng ký đợt đầu.',
            milestones: tpl.milestones.map((m) => ({ ...m }))
          },
          gallery: [{ url: tpl.heroImage, caption: `Phối cảnh tổng thể ${rawName}` }],
          videoUrl: ''
        };

        siteData.projects.unshift(newProj);
        editingProjectId = newProj.id;
        activeProjectEditorTab = 'basic';
        modal.classList.remove('open');
        persistChanges(`Đã khởi tạo dự án "${rawName}"!`);
        switchTab('projects');
      });
    });
  }
  modal?.classList.add('open');
}

function openPublishModal() {
  const cfg = getGitHubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    showToast('Hãy nhập thông tin kết nối GitHub lần đầu trước khi Xuất bản nhé!');
    switchTab('publish');
    return;
  }
  document.getElementById('publishProgressArea').style.display = 'none';
  document.getElementById('publishResultLinks').innerHTML = '';
  document.getElementById('confirmPublishBtn').disabled = false;
  document.getElementById('publishModal')?.classList.add('open');
}

function bindSingleImageUploader(dropzoneId, inputId, opts, onDone) {
  const dz = document.getElementById(dropzoneId);
  const inp = document.getElementById(inputId);
  const run = async (file) => {
    if (!file) return;
    const optimized = await optimizeImageFile(file, opts);
    await onDone(optimized);
  };
  dz?.addEventListener('click', () => inp?.click());
  dz?.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz?.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    run(e.dataTransfer?.files?.[0]);
  });
  inp?.addEventListener('change', (e) => run(e.target.files?.[0]));
}

function bindGlobalStudioEvents() {
  document.querySelectorAll('#studioNav .st-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingProjectId = null;
      editingNewsId = null;
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  document.getElementById('openSmartPasteTopBtn')?.addEventListener('click', openSmartPasteModal);
  document.getElementById('quickNewProjectTopBtn')?.addEventListener('click', openTemplateModal);
  document.getElementById('oneClickPublishTopBtn')?.addEventListener('click', openPublishModal);

  const handleManualLock = () => {
    lockAndShowGate('🔒 Đã khóa màn hình quản trị BDS Studio an toàn.');
  };
  document.getElementById('lockStudioTopBtn')?.addEventListener('click', handleManualLock);
  document.getElementById('lockStudioSidebarBtn')?.addEventListener('click', handleManualLock);

  // Ghi nhận thao tác người quản trị để duy trì phiên mở khóa
  ['click', 'keydown', 'pointerdown', 'touchstart'].forEach((evtName) => {
    window.addEventListener(evtName, () => touchActiveSession(), { passive: true });
  });

  // Smart Paste modal
  document.getElementById('closeSmartPasteBtn')?.addEventListener('click', () => {
    document.getElementById('smartPasteModal')?.classList.remove('open');
  });
  document.getElementById('fillSampleRawTextBtn')?.addEventListener('click', () => {
    document.getElementById('smartPasteTextarea').value = SAMPLE_RAW_PROJECT_TEXT;
  });
  document.getElementById('runSmartParseBtn')?.addEventListener('click', () => {
    const raw = document.getElementById('smartPasteTextarea')?.value?.trim();
    if (!raw) {
      showToast('Vui lòng dán thông tin dự án hoặc bấm "Điền thử văn bản mẫu"!');
      return;
    }
    const parsedProject = parseSmartProjectText(raw);
    siteData.projects.unshift(parsedProject);
    editingProjectId = parsedProject.id;
    activeProjectEditorTab = 'basic';
    document.getElementById('smartPasteModal')?.classList.remove('open');
    persistChanges(`⚡ Đã tự động phân tách & tạo dự án "${parsedProject.name}"!`);
    switchTab('projects');
  });

  // Template modal
  document.getElementById('closeTemplatePickerBtn')?.addEventListener('click', () => {
    document.getElementById('templatePickerModal')?.classList.remove('open');
  });

  // Publish modal
  document.getElementById('closePublishModalBtn')?.addEventListener('click', () => {
    document.getElementById('publishModal')?.classList.remove('open');
  });

  document.getElementById('confirmPublishBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirmPublishBtn');
    const area = document.getElementById('publishProgressArea');
    const lbl = document.getElementById('publishProgressLabel');
    const pct = document.getElementById('publishProgressPct');
    const fill = document.getElementById('publishProgressFill');
    const links = document.getElementById('publishResultLinks');

    btn.disabled = true;
    area.style.display = 'block';
    links.innerHTML = '';

    try {
      const cfg = getGitHubConfig();
      const msg = document.getElementById('publishCommitMsg')?.value || '✨ Cập nhật dự án từ BDS Studio';
      const result = await publishToGitHub({
        ...cfg,
        siteData,
        pendingUploads,
        commitMessage: msg,
        onProgress: (st) => {
          lbl.textContent = st.label;
          pct.textContent = `${st.percent}%`;
          fill.style.width = `${st.percent}%`;
        }
      });

      siteData = result.updatedSiteData;
      markDraftClean(siteData);
      await clearPendingUploads();
      await refreshUploadResolver();
      updateTopStatusUI();

      const liveUrl = `https://${cfg.owner}.github.io/${cfg.repo}/`;
      links.innerHTML = `
        <div style="color:var(--st-success);font-weight:700;margin-bottom:6px;">
          🎉 Đã lưu thẳng lên GitHub thành công! GitHub Actions đang tự động xuất bản...
        </div>
        <div id="liveActionPollText" style="color:var(--st-muted);margin-bottom:8px;">⏳ Đang kiểm tra tiến trình triển khai GitHub Pages...</div>
        <a href="${escapeHTML(result.commitUrl)}" target="_blank" style="color:var(--st-primary);font-weight:600;margin-right:14px;">↗ Xem Commit</a>
        <a href="${escapeHTML(liveUrl)}" target="_blank" style="color:var(--st-primary);font-weight:700;">🌐 Mở Website Chính Thức</a>
      `;

      // Tự động theo dõi tiến trình GitHub Actions trong 45 giây
      let checks = 0;
      const pollTimer = setInterval(async () => {
        checks++;
        const run = await fetchLatestDeployStatus(cfg);
        const pollEl = document.getElementById('liveActionPollText');
        if (!pollEl || checks > 9) {
          clearInterval(pollTimer);
          return;
        }
        if (run?.status === 'completed') {
          clearInterval(pollTimer);
          pollEl.innerHTML = run.conclusion === 'success'
            ? `✅ <strong>GitHub Pages đã cập nhật xong phiên bản mới nhất!</strong>`
            : `⚠️ Tiến trình kết thúc với trạng thái: ${escapeHTML(run.conclusion || '')} (<a href="${escapeHTML(run.htmlUrl)}" target="_blank">Xem chi tiết</a>)`;
        } else if (run) {
          pollEl.innerHTML = `⚙️ GitHub Actions đang chạy (${escapeHTML(run.status)})...`;
        }
      }, 5000);
    } catch (err) {
      lbl.textContent = 'Xuất bản chưa thành công';
      links.innerHTML = `<div style="color:var(--st-danger);font-weight:600;">✕ ${escapeHTML(err.message)}</div>`;
      btn.disabled = false;
    }
  });

  // PWA Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  document.getElementById('installPwaBtn')?.addEventListener('click', async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    await deferredPwaPrompt.userChoice;
    deferredPwaPrompt = null;
    document.getElementById('installPwaBtn').style.display = 'none';
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

/* ================= HỆ THỐNG CỔNG ĐĂNG NHẬP & KHÓA QUẢN TRỊ ================= */
function syncAdminSessionBadge() {
  const badgeEl = document.getElementById('adminSessionBadgeText');
  if (!badgeEl) return;
  const session = getActiveSession();
  if (!session) {
    badgeEl.textContent = '🔒 Đang khóa';
    return;
  }
  if (session.mode === 'github' && (session.adminLogin || session.owner)) {
    const repoPart = session.repo ? ` • ${session.repo}` : '';
    badgeEl.textContent = `🛡️ @${session.adminLogin || session.owner}${repoPart}`;
  } else {
    badgeEl.textContent = '💻 Chế độ Nội bộ (Localhost)';
  }
}

function startInactivityMonitor() {
  clearInterval(inactivityWatchTimer);
  inactivityWatchTimer = setInterval(() => {
    if (!document.body.classList.contains('studio-locked') && !getActiveSession()) {
      lockAndShowGate('⏳ Đã tự động khóa sau 30 phút không thao tác. Bản nháp của bạn vẫn an toàn!');
    }
  }, 20000);
}

function lockAndShowGate(noticeMessage = '') {
  clearInterval(inactivityWatchTimer);
  clearInterval(lockoutCountdownTimer);
  lockStudioSession();

  // Đóng toàn bộ modal và xóa nội dung vùng làm việc khỏi DOM khi đang khóa
  document.querySelectorAll('.st-modal-backdrop.open').forEach((m) => m.classList.remove('open'));
  const ws = document.getElementById('studioWorkspace');
  if (ws) ws.innerHTML = '';

  document.body.classList.add('studio-locked');
  renderAuthGate({ noticeMessage });
}

function bindPasswordEyeToggles(root) {
  root.querySelectorAll('[data-toggle-pass]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-toggle-pass');
      const inp = document.getElementById(inputId);
      if (!inp) return;
      const isHidden = inp.type === 'password';
      inp.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈' : '👁️';
    });
  });
}

function renderAuthGate({ modeOverride = null, noticeMessage = '' } = {}) {
  clearInterval(lockoutCountdownTimer);
  const gate = document.getElementById('studioAuthGate');
  if (!gate) return;

  const vaultMeta = getVaultMeta();
  const mode = modeOverride || (vaultMeta ? 'unlock' : 'setup');
  const boundRepo = detectHostedRepoBinding(publishedMetaSource || siteData);
  const isLocal = isLocalDevEnvironment();

  if (mode === 'unlock' && vaultMeta) {
    const initialChar = (vaultMeta.adminLogin || vaultMeta.owner || 'A').charAt(0).toUpperCase();
    const lockout = getLockoutStatus();

    gate.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand-head">
          <img src="./assets/images/logo-mark.svg" alt="BDS Studio" />
          <div>
            <span class="auth-eyebrow">🔒 Cổng Quản Trị Bảo Mật • AES-256</span>
            <h1 class="auth-title">Đăng Nhập BDS Studio</h1>
          </div>
        </div>

        <p class="auth-desc">
          Nhập mật khẩu mở khóa quản trị để tiếp tục chỉnh sửa dự án và xuất bản lên Website.
        </p>

        ${noticeMessage ? `<div class="auth-notice info">${escapeHTML(noticeMessage)}</div>` : ''}
        <div class="auth-notice error" id="authErrorBox" style="${lockout.isLockedOut ? '' : 'display:none;'}">
          ${lockout.isLockedOut ? `⏳ Tạm khóa chống dò mật khẩu: vui lòng đợi ${lockout.remainingSeconds} giây.` : ''}
        </div>

        <div class="auth-admin-chip">
          ${vaultMeta.adminAvatar
            ? `<img src="${escapeHTML(vaultMeta.adminAvatar)}" alt="Admin" class="auth-admin-avatar" />`
            : `<div class="auth-admin-avatar">${escapeHTML(initialChar)}</div>`
          }
          <div style="min-width:0;">
            <div style="font-weight:700;color:var(--st-primary);font-size:0.94rem;">
              @${escapeHTML(vaultMeta.adminLogin || vaultMeta.owner)}
            </div>
            <div style="font-size:0.8rem;color:var(--st-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              Kho lưu trữ: <strong>${escapeHTML(vaultMeta.owner)}/${escapeHTML(vaultMeta.repo)}</strong> (${escapeHTML(vaultMeta.branch || 'main')})
            </div>
          </div>
        </div>

        <form id="authUnlockForm">
          <div class="st-field">
            <label for="authUnlockPassword">Mật khẩu mở khóa Quản trị *</label>
            <div class="auth-input-wrap">
              <input
                type="password"
                id="authUnlockPassword"
                class="st-input"
                placeholder="Nhập mật khẩu của bạn..."
                autocomplete="current-password"
                required
              />
              <button type="button" class="auth-eye-btn" data-toggle-pass="authUnlockPassword" title="Hiện/ẩn mật khẩu">👁️</button>
            </div>
          </div>

          <button type="submit" class="st-btn st-btn-publish" id="authUnlockSubmitBtn" style="width:100%;padding:13px;font-size:0.95rem;" ${lockout.isLockedOut ? 'disabled' : ''}>
            🔓 Mở Khóa BDS Studio
          </button>
        </form>

        <div class="auth-footer-links">
          <button type="button" class="auth-link-btn" id="switchToSetupModeBtn">
            Đổi GitHub Token / Đặt lại mật khẩu
          </button>
          <a href="./index.html" style="color:var(--st-muted);text-decoration:none;font-weight:600;">
            ← Về Website khách hàng
          </a>
        </div>
      </div>
    `;

    bindPasswordEyeToggles(gate);

    const errBox = document.getElementById('authErrorBox');
    const submitBtn = document.getElementById('authUnlockSubmitBtn');
    const passInput = document.getElementById('authUnlockPassword');
    if (!lockout.isLockedOut) {
      setTimeout(() => passInput?.focus(), 60);
    } else {
      startLockoutCountdown(errBox, submitBtn);
    }

    document.getElementById('switchToSetupModeBtn')?.addEventListener('click', () => {
      renderAuthGate({
        modeOverride: 'setup',
        noticeMessage: 'Nhập lại mã GitHub Personal Access Token chính chủ để đặt mật khẩu mới.'
      });
    });

    document.getElementById('authUnlockForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!submitBtn || !errBox) return;
      errBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang giải mã khóa AES-256...';

      try {
        await unlockWithPassword(passInput.value, boundRepo);
        await enterUnlockedWorkspace();
        showToast('🔓 Chào mừng Quản trị viên quay trở lại!');
      } catch (err) {
        errBox.textContent = `✕ ${err.message}`;
        errBox.style.display = 'block';
        passInput.value = '';
        passInput.focus();
        const nextLock = getLockoutStatus();
        if (nextLock.isLockedOut) {
          submitBtn.textContent = '🔓 Mở Khóa BDS Studio';
          startLockoutCountdown(errBox, submitBtn);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = '🔓 Mở Khóa BDS Studio';
        }
      }
    });

    return;
  }

  // CHẾ ĐỘ XÁC THỰC CHỦ SỞ HỮU GITHUB LẦN ĐẦU (HOẶC TRÊN THIẾT BỊ LẠ)
  const prefillOwner = boundRepo.owner || vaultMeta?.owner || '';
  const prefillRepo = boundRepo.repo || vaultMeta?.repo || '';
  const prefillBranch = vaultMeta?.branch || 'main';
  const readonlyAttr = boundRepo.locked ? 'readonly' : '';

  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand-head">
        <img src="./assets/images/logo-mark.svg" alt="BDS Studio" />
        <div>
          <span class="auth-eyebrow">🛡️ Xác Thực Chính Chủ GitHub</span>
          <h1 class="auth-title">Thiết Lập Đăng Nhập Quản Trị</h1>
        </div>
      </div>

      <p class="auth-desc">
        Chỉ tài khoản có quyền <strong>Ghi (Write/Push)</strong> trên kho lưu trữ GitHub của Website mới có thể đăng nhập. Khóa Token sẽ được mã hóa <strong>AES-256</strong> để từ lần sau bạn chỉ cần nhập mật khẩu ngắn.
      </p>

      ${noticeMessage ? `<div class="auth-notice info">${escapeHTML(noticeMessage)}</div>` : ''}
      <div class="auth-notice error" id="authErrorBox" style="display:none;"></div>

      <form id="authSetupForm">
        <div class="st-grid-2">
          <div class="st-field">
            <label for="authGhOwner">
              GitHub Username * ${boundRepo.locked ? '<span style="color:#8E6C27;font-size:0.74rem;">🔒 Cố định</span>' : ''}
            </label>
            <div class="auth-input-wrap">
              <input
                type="text"
                id="authGhOwner"
                class="st-input"
                style="padding-right:14px;"
                value="${escapeHTML(prefillOwner)}"
                placeholder="VD: quangbds"
                ${readonlyAttr}
                required
              />
            </div>
          </div>

          <div class="st-field">
            <label for="authGhRepo">
              Tên Repository * ${boundRepo.locked ? '<span style="color:#8E6C27;font-size:0.74rem;">🔒 Cố định</span>' : ''}
            </label>
            <div class="auth-input-wrap">
              <input
                type="text"
                id="authGhRepo"
                class="st-input"
                style="padding-right:14px;"
                value="${escapeHTML(prefillRepo)}"
                placeholder="VD: bds-luxury"
                ${readonlyAttr}
                required
              />
            </div>
          </div>
        </div>

        <div class="st-field">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <label for="authGhToken">GitHub Personal Access Token (PAT) *</label>
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="font-size:0.79rem;color:var(--st-primary);font-weight:700;">
              ↗ Lấy mã Fine-grained Token
            </a>
          </div>
          <div class="auth-input-wrap">
            <input
              type="password"
              id="authGhToken"
              class="st-input"
              placeholder="github_pat_... (Quyền Contents: Read and write)"
              autocomplete="off"
              required
            />
            <button type="button" class="auth-eye-btn" data-toggle-pass="authGhToken" title="Hiện/ẩn Token">👁️</button>
          </div>
        </div>

        <div class="st-grid-2">
          <div class="st-field">
            <label for="authNewPassword">Đặt Mật khẩu mở khóa nhanh *</label>
            <div class="auth-input-wrap">
              <input
                type="password"
                id="authNewPassword"
                class="st-input"
                placeholder="Tối thiểu 4 ký tự..."
                autocomplete="new-password"
                minlength="4"
                required
              />
              <button type="button" class="auth-eye-btn" data-toggle-pass="authNewPassword" title="Hiện/ẩn mật khẩu">👁️</button>
            </div>
          </div>

          <div class="st-field">
            <label for="authGhBranch">Nhánh xuất bản (Branch)</label>
            <input
              type="text"
              id="authGhBranch"
              class="st-input"
              value="${escapeHTML(prefillBranch)}"
              placeholder="main"
            />
          </div>
        </div>

        <button type="submit" class="st-btn st-btn-publish" id="authSetupSubmitBtn" style="width:100%;padding:13px;font-size:0.95rem;margin-top:4px;">
          🛡️ Xác Thực GitHub &amp; Đăng Nhập
        </button>
      </form>

      ${isLocal ? `
        <div class="auth-divider">Hoặc chạy thử trên máy tính cá nhân</div>
        <button type="button" class="st-btn st-btn-outline" id="enterLocalDevBtn" style="width:100%;">
          💻 Vào chế độ Soạn thảo Nội bộ (Localhost — Chưa cần GitHub)
        </button>
      ` : ''}

      <div class="auth-footer-links">
        ${vaultMeta
          ? `<button type="button" class="auth-link-btn" id="backToUnlockModeBtn">← Quay lại mở khóa bằng mật khẩu</button>`
          : `<span style="color:var(--st-muted);">Token không bao giờ lưu lên mạng</span>`
        }
        <a href="./index.html" style="color:var(--st-muted);text-decoration:none;font-weight:600;">
          ← Về Website khách hàng
        </a>
      </div>
    </div>
  `;

  bindPasswordEyeToggles(gate);

  setTimeout(() => {
    const focusTarget = prefillOwner && prefillRepo
      ? document.getElementById('authGhToken')
      : document.getElementById('authGhOwner');
    focusTarget?.focus();
  }, 60);

  document.getElementById('backToUnlockModeBtn')?.addEventListener('click', () => {
    renderAuthGate({ modeOverride: 'unlock' });
  });

  document.getElementById('enterLocalDevBtn')?.addEventListener('click', async () => {
    try {
      loginLocalDevMode();
      await enterUnlockedWorkspace();
      showToast('💻 Đang mở BDS Studio ở chế độ máy cá nhân (Localhost)!');
    } catch (err) {
      const errBox = document.getElementById('authErrorBox');
      if (errBox) {
        errBox.textContent = `✕ ${err.message}`;
        errBox.style.display = 'block';
      }
    }
  });

  document.getElementById('authSetupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('authErrorBox');
    const submitBtn = document.getElementById('authSetupSubmitBtn');
    if (!errBox || !submitBtn) return;

    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang kiểm tra quyền chủ sở hữu trên GitHub...';

    try {
      const owner = document.getElementById('authGhOwner')?.value || '';
      const repo = document.getElementById('authGhRepo')?.value || '';
      const branch = document.getElementById('authGhBranch')?.value || 'main';
      const token = document.getElementById('authGhToken')?.value || '';
      const password = document.getElementById('authNewPassword')?.value || '';

      const { verified } = await setupAdminVaultAndLogin({
        owner,
        repo,
        branch,
        token,
        password,
        boundRepo
      });

      await enterUnlockedWorkspace();
      showToast(`🛡️ Đã xác thực @${verified.adminLogin} & bật khóa mật khẩu AES-256!`);
    } catch (err) {
      errBox.textContent = `✕ ${err.message}`;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '🛡️ Xác Thực GitHub & Đăng Nhập';
    }
  });
}

function startLockoutCountdown(errBox, submitBtn) {
  clearInterval(lockoutCountdownTimer);
  if (submitBtn) submitBtn.disabled = true;
  lockoutCountdownTimer = setInterval(() => {
    const st = getLockoutStatus();
    if (!st.isLockedOut) {
      clearInterval(lockoutCountdownTimer);
      if (errBox) errBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
      document.getElementById('authUnlockPassword')?.focus();
      return;
    }
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = `⏳ Tạm khóa chống dò mật khẩu: vui lòng đợi ${st.remainingSeconds} giây.`;
    }
  }, 1000);
}

async function enterUnlockedWorkspace() {
  clearInterval(lockoutCountdownTimer);
  document.body.classList.remove('studio-locked');
  const gate = document.getElementById('studioAuthGate');
  if (gate) gate.innerHTML = '';

  await refreshUploadResolver();
  if (!siteData) {
    const draft = getStudioDraft();
    if (draft) {
      siteData = draft;
    } else {
      siteData = publishedMetaSource || (await fetchPublishedSiteData());
      markDraftClean(siteData);
    }
  }

  syncSidebarCounters();
  updateTopStatusUI();
  syncAdminSessionBadge();

  if (!globalEventsBound) {
    bindGlobalStudioEvents();
    globalEventsBound = true;
  }

  startInactivityMonitor();
  renderWorkspace();
}

(async function initStudio() {
  try {
    // Đọc nhẹ metadata công khai để biết repoOwner/repoName nếu chạy trên tên miền riêng
    try {
      publishedMetaSource = await fetchPublishedSiteData();
    } catch {
      publishedMetaSource = null;
    }

    if (getActiveSession()) {
      await enterUnlockedWorkspace();
    } else {
      document.body.classList.add('studio-locked');
      renderAuthGate();
    }
  } catch (err) {
    console.error(err);
  }
})();
