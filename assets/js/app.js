import { ICONS } from './default-data.js';
import {
  applyThemeToDocument,
  createAssetResolver,
  fetchPublishedSiteData,
  getAllPendingUploads,
  getStudioDraft,
  saveLocalLead
} from './store.js';

let siteData = null;
let resolveAsset = (u) => u || '';
let heroSlideIndex = 0;
let heroTimer = null;
let activeCategoryFilter = 'Tất cả';
let activeStatusFilter = 'Tất cả';
let searchKeyword = '';

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanPhone(phone = '') {
  return String(phone).replace(/[^\d+]/g, '');
}

async function loadInitialData() {
  const params = new URLSearchParams(window.location.search);
  const isDraftPreview = params.get('preview') === 'draft';

  if (isDraftPreview) {
    const pending = await getAllPendingUploads();
    resolveAsset = createAssetResolver(pending);
    const draft = getStudioDraft();
    if (draft) {
      siteData = draft;
      return;
    }
  }

  siteData = await fetchPublishedSiteData();
}

function syncChrome() {
  if (!siteData) return;
  const { brand = {}, theme = {}, projects = [] } = siteData;

  applyThemeToDocument(theme);
  document.title = `${brand.name || 'Bất Động Sản'} — ${brand.tagline || ''}`;

  const logoEl = document.getElementById('headerLogo');
  if (logoEl && brand.logoUrl) logoEl.src = resolveAsset(brand.logoUrl);

  const nameEl = document.getElementById('headerBrandName');
  if (nameEl) nameEl.textContent = brand.name || 'Hưng Lộc Phát Luxury';

  const subEl = document.getElementById('headerBrandSub');
  if (subEl) subEl.textContent = brand.logoSubtext || 'REAL ESTATE DEVELOPMENT';

  const hotlineBtn = document.getElementById('headerHotlineBtn');
  if (hotlineBtn) {
    hotlineBtn.href = `tel:${cleanPhone(brand.hotline)}`;
    hotlineBtn.innerHTML = `${ICONS.phone}<span>${escapeHTML(brand.hotline || '0909 888 688')}</span>`;
  }

  const mobileHotlineBtn = document.getElementById('mobileDrawerHotlineBtn');
  if (mobileHotlineBtn) {
    mobileHotlineBtn.href = `tel:${cleanPhone(brand.hotline)}`;
    mobileHotlineBtn.innerHTML = `${ICONS.phone}<span>Gọi Hotline: ${escapeHTML(brand.hotline || '0909 888 688')}</span>`;
  }

  // Render Footer
  const footerEl = document.getElementById('siteFooter');
  if (footerEl) {
    const topProjects = projects.slice(0, 4);
    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <img src="${escapeHTML(resolveAsset(brand.logoUrl || './assets/images/logo-mark.svg'))}" alt="Logo" style="width:46px;height:46px;border-radius:14px;object-fit:cover;" />
              <div>
                <div class="serif-heading" style="font-size:1.3rem;color:#FFFFFF;">${escapeHTML(brand.name)}</div>
                <div style="font-size:0.68rem;letter-spacing:0.15em;color:var(--color-accent-soft);">${escapeHTML(brand.logoSubtext || '')}</div>
              </div>
            </div>
            <p style="font-size:0.92rem;margin:0 0 18px;max-width:380px;">${escapeHTML(brand.description || '')}</p>
            <div style="font-size:0.86rem;color:var(--color-accent-soft);">Giờ làm việc: ${escapeHTML(brand.workingHours || '08:00 – 20:30')}</div>
          </div>

          <div>
            <h4 class="footer-heading">Dự Án Tiêu Biểu</h4>
            <ul class="footer-links">
              ${topProjects.map((p) => `<li><a href="#/du-an/${encodeURIComponent(p.slug)}">${escapeHTML(p.name)}</a></li>`).join('')}
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Khám Phá Nhanh</h4>
            <ul class="footer-links">
              <li><a href="#/">Trang chủ thương hiệu</a></li>
              <li><a href="#/du-an" data-scroll="projectsSection">Danh mục dự án mở bán</a></li>
              <li><a href="#/tin-tuc" data-scroll="newsSection">Tin tức &amp; Phân tích thị trường</a></li>
              <li><a href="#/lien-he" data-scroll="consultSection">Đăng ký nhận bảng giá &amp; tư vấn</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Văn Phòng Giao Dịch</h4>
            <ul class="footer-links">
              <li>📍 ${escapeHTML(brand.address || '')}</li>
              <li>📞 <a href="tel:${cleanPhone(brand.hotline)}">${escapeHTML(brand.hotline || '')}</a></li>
              <li>✉️ <a href="mailto:${escapeHTML(brand.email || '')}">${escapeHTML(brand.email || '')}</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${escapeHTML(brand.name)}. Kiến tạo không gian sống chuẩn mực &amp; bền vững.</span>
          <span style="opacity:0.75;">Tư vấn chuyên sâu 1:1 • Bảo mật thông tin khách hàng</span>
        </div>
      </div>
    `;
  }

  // Render Floating Dock
  const dockEl = document.getElementById('floatingDock');
  if (dockEl) {
    const zaloNum = cleanPhone(brand.zalo || brand.hotline);
    dockEl.innerHTML = `
      <a href="https://zalo.me/${zaloNum}" target="_blank" rel="noopener" class="dock-btn dock-zalo">
        💬 Chat Zalo Bảng Giá
      </a>
      <a href="tel:${cleanPhone(brand.hotline)}" class="dock-btn dock-phone">
        📞 ${escapeHTML(brand.hotline || '0909 888 688')}
      </a>
    `;
  }
}

/* ================= TRANG CHỦ ================= */
function renderHomePage() {
  const { brand = {}, heroSlides = [], stats = [], projects = [], values = [], news = [], partners = [] } = siteData;
  const slides = heroSlides.length > 0 ? heroSlides : [{
    badge: 'BIỂU TƯỢNG SỐNG XANH THƯỢNG LƯU',
    title: brand.name,
    subtitle: brand.description,
    image: './assets/images/hero-emerald-residences.jpg',
    ctaPrimaryText: 'Khám phá dự án',
    projectSlug: projects[0]?.slug || '',
    highlightMetric: 'Pháp lý minh bạch • Sổ hồng lâu dài'
  }];

  heroSlideIndex = Math.min(heroSlideIndex, slides.length - 1);
  const currentSlide = slides[heroSlideIndex];
  const categories = ['Tất cả', ...new Set(projects.map((p) => p.category).filter(Boolean))];

  const root = document.getElementById('appRoot');
  root.innerHTML = `
    <!-- HERO SHOWCASE -->
    <section class="hero-section">
      <div class="hero-slides" id="heroSlidesBg">
        ${slides.map((s, idx) => `
          <div class="hero-slide-bg ${idx === heroSlideIndex ? 'active' : ''}"
               style="background-image:url('${escapeHTML(resolveAsset(s.image))}')"></div>
        `).join('')}
      </div>
      <div class="hero-overlay"></div>

      <div class="hero-content-wrap">
        <div id="heroTextStage">
          <div class="hero-eyebrow">✦ ${escapeHTML(currentSlide.badge || '')}</div>
          <h1 class="hero-title">${escapeHTML(currentSlide.title || '')}</h1>
          <p class="hero-subtitle">${escapeHTML(currentSlide.subtitle || '')}</p>
          ${currentSlide.highlightMetric ? `
            <div class="hero-metric-pill">
              <span style="color:var(--color-accent-soft);">★</span>
              <span>${escapeHTML(currentSlide.highlightMetric)}</span>
            </div>
          ` : ''}
          <div class="hero-cta-row">
            <a href="${currentSlide.projectSlug ? `#/du-an/${encodeURIComponent(currentSlide.projectSlug)}` : '#/du-an'}" class="btn btn-gold">
              <span>${escapeHTML(currentSlide.ctaPrimaryText || 'Khám phá dự án')}</span>
              ${ICONS.arrowRight}
            </a>
            <button type="button" class="btn btn-outline-light" data-open-consult="${escapeHTML(currentSlide.title || 'Tư vấn dự án')}">
              Đăng ký nhận bảng giá ưu đãi
            </button>
          </div>

          ${slides.length > 1 ? `
            <div class="hero-dots" id="heroDots">
              ${slides.map((_, idx) => `
                <button type="button" class="hero-dot ${idx === heroSlideIndex ? 'active' : ''}" data-slide-idx="${idx}" aria-label="Slide ${idx + 1}"></button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- BỘ TÌM NHANH DỰ ÁN KÍNH MỜ -->
        <div class="hero-finder-card">
          <h3 class="hero-finder-title serif-heading">Tìm Tổ Ấm &amp; Cơ Hội Đầu Tư</h3>
          <p class="hero-finder-sub">Chọn phân khúc phù hợp nhu cầu an cư hoặc tích sản dài hạn</p>
          <div class="finder-grid">
            <input type="text" id="quickSearchInput" class="finder-input" placeholder="Nhập tên dự án hoặc khu vực (VD: Quận 7, Mũi Né)..." value="${escapeHTML(searchKeyword)}" />
            <select id="quickCategorySelect" class="finder-select">
              ${categories.map((c) => `<option value="${escapeHTML(c)}">${c === 'Tất cả' ? 'Tất cả loại hình BĐS' : escapeHTML(c)}</option>`).join('')}
            </select>
            <select id="quickStatusSelect" class="finder-select">
              <option value="Tất cả">Tất cả trạng thái mở bán</option>
              <option value="Đang mở bán">Đang mở bán</option>
              <option value="Sắp ra mắt">Sắp ra mắt</option>
              <option value="Đang triển khai">Đang triển khai</option>
              <option value="Đã bàn giao">Đã bàn giao</option>
            </select>
            <button type="button" id="applyQuickFinderBtn" class="btn btn-gold" style="width:100%;justify-content:center;">
              Lọc dự án phù hợp (${projects.length})
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- VỀ THƯƠNG HIỆU & DẤU ẤN UY TÍN -->
    <section class="section" id="aboutSection">
      <div class="container">
        <div class="about-grid reveal">
          <div class="arch-showcase">
            <img src="${escapeHTML(resolveAsset(projects[0]?.heroImage || './assets/images/hero-emerald-residences.jpg'))}" alt="${escapeHTML(brand.name)}" class="arch-main-img" />
            <div class="arch-floating-badge">
              <strong>${escapeHTML(stats[0]?.value || '20+')}</strong>
              <span style="font-size:0.88rem;opacity:0.9;">${escapeHTML(stats[0]?.label || 'Năm kiến tạo không gian sống xanh')}</span>
            </div>
          </div>

          <div>
            <span class="eyebrow">Dấu Ấn Nhà Phát Triển BĐS</span>
            <h2 class="section-title">${escapeHTML(brand.tagline || 'Kiến Tạo Biểu Tượng Sống Xanh')}</h2>
            <p class="section-desc" style="margin-bottom:14px;">${escapeHTML(brand.description || '')}</p>

            <div class="stats-grid">
              ${stats.map((st) => `
                <div class="stat-card">
                  <div class="stat-value">${escapeHTML(st.value)}</div>
                  <div class="stat-label">${escapeHTML(st.label)}</div>
                  <div class="stat-note">${escapeHTML(st.note || '')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DANH MỤC DỰ ÁN NỔI BẬT -->
    <section class="section section-alt" id="projectsSection">
      <div class="container">
        <div class="section-header reveal">
          <span class="eyebrow">Bộ Sưu Tập Dự Án Tuyển Chọn</span>
          <h2 class="section-title">Tuyệt Tác Kiến Trúc &amp; Tâm Điểm Đầu Tư</h2>
          <p class="section-desc">Mỗi dự án là một tác phẩm nghệ thuật hài hòa giữa đường nét mềm mại, cảnh quan sinh thái và chuẩn sống tinh hoa.</p>
        </div>

        <div class="filter-pills reveal" id="categoryFilterBar">
          ${categories.map((cat) => `
            <button type="button" class="filter-pill ${cat === activeCategoryFilter ? 'active' : ''}" data-cat="${escapeHTML(cat)}">
              ${escapeHTML(cat)}
            </button>
          `).join('')}
        </div>

        <div class="projects-grid" id="projectsGridContainer"></div>
      </div>
    </section>

    <!-- GIÁ TRỊ CỐT LÕI -->
    <section class="section" id="valuesSection">
      <div class="container">
        <div class="section-header centered reveal">
          <span class="eyebrow">Triết Lý Phát Triển Bền Vững</span>
          <h2 class="section-title">Chuẩn Mực Tạo Nên Sự Khác Biệt</h2>
          <p class="section-desc">Cam kết chất lượng bàn giao vượt kỳ vọng, đồng hành trọn vòng đời tài sản cùng mỗi gia chủ.</p>
        </div>

        <div class="values-grid reveal">
          ${values.map((v) => `
            <div class="value-card">
              <div class="value-icon">${ICONS[v.icon] || ICONS.sparkles}</div>
              <h3>${escapeHTML(v.title)}</h3>
              <p>${escapeHTML(v.desc)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- TIN TỨC & SỰ KIỆN -->
    <section class="section section-alt" id="newsSection">
      <div class="container">
        <div class="section-header reveal" style="display:flex;justify-content:space-between;align-items:flex-end;max-width:100%;flex-wrap:wrap;gap:16px;">
          <div style="max-width:650px;">
            <span class="eyebrow">Góc Nhìn &amp; Chuyển Động</span>
            <h2 class="section-title">Tin Tức Thị Trường &amp; Tiến Độ Dự Án</h2>
          </div>
        </div>

        <div class="news-grid reveal">
          ${news.map((n) => `
            <article class="news-card" data-news-slug="${escapeHTML(n.slug)}">
              <img src="${escapeHTML(resolveAsset(n.image || './assets/images/hero-emerald-residences.jpg'))}" alt="${escapeHTML(n.title)}" class="news-card-img" loading="lazy" />
              <div class="news-card-body">
                <div class="news-meta">${escapeHTML(n.category || 'Tin tức')} • ${escapeHTML(n.date || '')}</div>
                <h3 class="news-card-title">${escapeHTML(n.title)}</h3>
                <p class="project-card-tagline" style="margin-bottom:16px;">${escapeHTML(n.excerpt || '')}</p>
                <span class="project-explore-link" style="margin-top:auto;">Đọc bài viết chi tiết ${ICONS.arrowRight}</span>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- ĐỐI TÁC CHIẾN LƯỢC -->
    <section class="section">
      <div class="container">
        <div class="section-header centered reveal">
          <span class="eyebrow">Bảo Chứng Uy Tín Quốc Tế</span>
          <h2 class="section-title">Đối Tác Tài Chính &amp; Kiến Trúc Chiến Lược</h2>
        </div>
        <div class="partners-grid reveal">
          ${partners.map((pt) => `
            <div class="partner-pill">
              <strong>${escapeHTML(pt.name)}</strong>
              <span>${escapeHTML(pt.role || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- ĐĂNG KÝ TƯ VẤN CUỐI TRANG -->
    <section class="section" id="consultSection" style="padding-top:20px;">
      <div class="container">
        <div class="consult-banner reveal">
          <div>
            <span class="eyebrow" style="background:rgba(255,255,255,0.14);color:var(--color-accent-soft);">Tư Vấn Chuyên Sâu &amp; Tham Quan Sa Bàn</span>
            <h2 class="section-title" style="color:#FFFFFF;margin-top:8px;">Nhận Trọn Bộ Bảng Giá, Giỏ Hàng Đẹp &amp; Ưu Đãi Nội Bộ</h2>
            <p style="color:rgba(255,255,255,0.84);margin:0 0 24px;">
              Đội ngũ chuyên gia sẵn sàng hỗ trợ tính toán phương án tài chính tối ưu, gửi mặt bằng phân giải cao và đặt lịch xe đưa đón tham quan thực tế hoàn toàn miễn phí.
            </p>
            <div style="display:grid;gap:10px;font-size:0.95rem;">
              <div>✦ Cam kết bảo mật tuyệt đối thông tin Quý khách hàng</div>
              <div>✦ Giá gốc trực tiếp Chủ đầu tư — không chênh lệch</div>
              <div>✦ Hotline hỗ trợ 24/7: <strong style="color:var(--color-accent-soft);">${escapeHTML(brand.hotline || '')}</strong></div>
            </div>
          </div>

          <div class="consult-form-card">
            <h3 class="serif-heading" style="font-size:1.5rem;color:var(--color-primary);margin-bottom:16px;">Đăng Ký Nhận Thông Tin Sớm</h3>
            <form id="inlineConsultForm" class="form-grid">
              <input type="text" name="fullName" class="form-input" placeholder="Họ và tên Quý khách *" required />
              <input type="tel" name="phone" class="form-input" placeholder="Số điện thoại / Zalo *" required />
              <select name="project" class="form-input">
                ${projects.map((p) => `<option value="${escapeHTML(p.name)}">Quan tâm: ${escapeHTML(p.name)}</option>`).join('')}
                <option value="Tư vấn tổng thể danh mục">Cần tư vấn chọn dự án phù hợp</option>
              </select>
              <textarea name="note" rows="2" class="form-input" placeholder="Nhu cầu cụ thể (VD: Căn 2PN hướng sông, tầm tài chính 5–7 tỷ...)"></textarea>
              <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;">
                Nhận Bảng Giá &amp; Chính Sách Ngay
              </button>
            </form>
            <div id="inlineConsultFeedback" style="display:none;margin-top:14px;"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  renderFilteredProjectCards();
  bindHomeEvents(slides);
  setupScrollReveal();
}

function renderFilteredProjectCards() {
  const grid = document.getElementById('projectsGridContainer');
  if (!grid || !siteData) return;

  const filtered = (siteData.projects || []).filter((p) => {
    const matchCat = activeCategoryFilter === 'Tất cả' || p.category === activeCategoryFilter;
    const matchStatus = activeStatusFilter === 'Tất cả' || p.status === activeStatusFilter;
    const kw = searchKeyword.trim().toLowerCase();
    const matchKw = !kw ||
      `${p.name} ${p.locationShort} ${p.address} ${p.tagline}`.toLowerCase().includes(kw);
    return matchCat && matchStatus && matchKw;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;background:#FFFFFF;border-radius:var(--radius-card);">
        <h3 style="color:var(--color-primary);margin-bottom:8px;">Chưa tìm thấy dự án khớp bộ lọc</h3>
        <p style="color:var(--color-ink-muted);margin-bottom:18px;">Hãy thử đặt lại bộ lọc để khám phá toàn bộ danh mục dự án hiện có.</p>
        <button type="button" class="btn btn-soft" id="resetProjectFilterBtn">Xem tất cả dự án</button>
      </div>
    `;
    document.getElementById('resetProjectFilterBtn')?.addEventListener('click', () => {
      activeCategoryFilter = 'Tất cả';
      activeStatusFilter = 'Tất cả';
      searchKeyword = '';
      renderHomePage();
    });
    return;
  }

  grid.innerHTML = filtered.map((p) => `
    <article class="project-card" data-project-slug="${escapeHTML(p.slug)}">
      <div class="project-card-media">
        <img src="${escapeHTML(resolveAsset(p.heroImage))}" alt="${escapeHTML(p.name)}" loading="lazy" />
        <div class="project-badges">
          <span class="status-pill ${p.status === 'Sắp ra mắt' ? 'soon' : ''}">${escapeHTML(p.status || 'Đang mở bán')}</span>
          <span class="price-pill">${escapeHTML(p.priceDisplay || 'Liên hệ')}</span>
        </div>
      </div>
      <div class="project-card-body">
        <div class="project-category-tag">${escapeHTML(p.category || 'Bất động sản cao cấp')}</div>
        <h3 class="project-card-title">${escapeHTML(p.name)}</h3>
        <div class="project-location-row">
          ${ICONS.mapPin}
          <span>${escapeHTML(p.locationShort || p.address || '')}</span>
        </div>
        <p class="project-card-tagline">${escapeHTML(p.tagline || p.summary || '')}</p>
        <div class="project-meta-strip">
          <span style="color:var(--color-ink-muted);font-weight:500;">${escapeHTML(p.areaRange || '')}</span>
          <span class="project-explore-link">Khám phá ${ICONS.arrowRight}</span>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('[data-project-slug]').forEach((card) => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-project-slug');
      window.location.hash = `#/du-an/${encodeURIComponent(slug)}`;
    });
  });
}

function bindHomeEvents(slides) {
  clearInterval(heroTimer);
  if (slides.length > 1) {
    heroTimer = setInterval(() => {
      heroSlideIndex = (heroSlideIndex + 1) % slides.length;
      updateHeroSlideDOM(slides);
    }, 6500);
  }

  document.querySelectorAll('[data-slide-idx]').forEach((dot) => {
    dot.addEventListener('click', () => {
      heroSlideIndex = Number(dot.getAttribute('data-slide-idx'));
      updateHeroSlideDOM(slides);
    });
  });

  document.querySelectorAll('#categoryFilterBar [data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategoryFilter = btn.getAttribute('data-cat');
      document.querySelectorAll('#categoryFilterBar .filter-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderFilteredProjectCards();
    });
  });

  document.getElementById('applyQuickFinderBtn')?.addEventListener('click', () => {
    searchKeyword = document.getElementById('quickSearchInput')?.value || '';
    activeCategoryFilter = document.getElementById('quickCategorySelect')?.value || 'Tất cả';
    activeStatusFilter = document.getElementById('quickStatusSelect')?.value || 'Tất cả';
    renderFilteredProjectCards();
    document.getElementById('projectsSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelectorAll('[data-news-slug]').forEach((card) => {
    card.addEventListener('click', () => {
      window.location.hash = `#/tin-tuc/${encodeURIComponent(card.getAttribute('data-news-slug'))}`;
    });
  });

  document.querySelectorAll('[data-open-consult]').forEach((btn) => {
    btn.addEventListener('click', () => openConsultModal(btn.getAttribute('data-open-consult')));
  });

  const inlineForm = document.getElementById('inlineConsultForm');
  if (inlineForm) {
    inlineForm.addEventListener('submit', (e) => handleLeadSubmit(e, inlineForm, 'inlineConsultFeedback'));
  }
}

function updateHeroSlideDOM(slides) {
  const s = slides[heroSlideIndex];
  if (!s) return;
  document.querySelectorAll('#heroSlidesBg .hero-slide-bg').forEach((el, i) => {
    el.classList.toggle('active', i === heroSlideIndex);
  });
  document.querySelectorAll('#heroDots .hero-dot').forEach((el, i) => {
    el.classList.toggle('active', i === heroSlideIndex);
  });
  const stage = document.getElementById('heroTextStage');
  if (!stage) return;
  const eyebrow = stage.querySelector('.hero-eyebrow');
  const title = stage.querySelector('.hero-title');
  const sub = stage.querySelector('.hero-subtitle');
  const cta = stage.querySelector('.btn-gold');
  if (eyebrow) eyebrow.textContent = `✦ ${s.badge || ''}`;
  if (title) title.textContent = s.title || '';
  if (sub) sub.textContent = s.subtitle || '';
  if (cta) {
    cta.href = s.projectSlug ? `#/du-an/${encodeURIComponent(s.projectSlug)}` : '#/du-an';
    cta.innerHTML = `<span>${escapeHTML(s.ctaPrimaryText || 'Khám phá dự án')}</span>${ICONS.arrowRight}`;
  }
}

/* ================= TRANG CHI TIẾT DỰ ÁN ================= */
function renderProjectDetailPage(slug) {
  clearInterval(heroTimer);
  const project = (siteData.projects || []).find((p) => p.slug === slug);
  const root = document.getElementById('appRoot');

  if (!project) {
    root.innerHTML = `
      <section class="section" style="padding-top:160px;text-align:center;">
        <div class="container">
          <h2 class="section-title">Không tìm thấy dự án</h2>
          <p class="section-desc" style="margin-bottom:24px;">Dự án có thể đã đổi đường dẫn hoặc ngừng hiển thị.</p>
          <a href="#/" class="btn btn-primary">Quay về Trang chủ</a>
        </div>
      </section>
    `;
    return;
  }

  const mapSrc = project.location?.mapEmbedUrl
    ? project.location.mapEmbedUrl
    : `https://maps.google.com/maps?q=${encodeURIComponent(project.location?.mapQuery || project.address || project.name)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const floorPlans = project.floorPlans || [];
  const basePrice = Number(project.numericPriceBillion || 5.5);

  root.innerHTML = `
    <section class="project-hero" style="background-image:url('${escapeHTML(resolveAsset(project.heroImage))}')">
      <div class="container project-hero-inner">
        <a href="#/" class="breadcrumb-pill">← Quay lại danh mục dự án</a>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <span class="status-pill">${escapeHTML(project.status || 'Đang mở bán')}</span>
          <span class="status-pill" style="background:rgba(200,164,93,0.88);color:#1A150C;">${escapeHTML(project.category || '')}</span>
        </div>
        <h1 class="hero-title" style="max-width:880px;">${escapeHTML(project.name)}</h1>
        <p class="hero-subtitle" style="margin-bottom:24px;">${escapeHTML(project.tagline || '')}</p>

        <div class="hero-cta-row">
          <button type="button" class="btn btn-gold" data-open-consult="${escapeHTML(project.name)}">
            Tải Brochure &amp; Bảng Giá Chi Tiết
          </button>
          <a href="#vay-ngan-hang" class="btn btn-outline-light" data-anchor="secFinance">
            Tính khoản trả góp hàng tháng
          </a>
        </div>

        <div class="project-keybar">
          <div class="keybar-item">
            <span>Giá tham khảo</span>
            <strong>${escapeHTML(project.priceDisplay || 'Liên hệ')}</strong>
          </div>
          <div class="keybar-item">
            <span>Diện tích sản phẩm</span>
            <strong>${escapeHTML(project.areaRange || 'Đa dạng')}</strong>
          </div>
          <div class="keybar-item">
            <span>Khu vực tọa lạc</span>
            <strong>${escapeHTML(project.locationShort || '')}</strong>
          </div>
          <div class="keybar-item">
            <span>Pháp lý sở hữu</span>
            <strong>${escapeHTML(project.specs?.find((s) => /pháp lý/i.test(s.label))?.value || 'Minh bạch chuẩn chỉnh')}</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- Thanh chuyển mục nổi -->
    <div class="project-subnav">
      <div class="container">
        <div class="project-subnav-inner">
          <a href="#tong-quan" class="subnav-pill" data-anchor="secOverview">Tổng quan</a>
          <a href="#vi-tri" class="subnav-pill" data-anchor="secLocation">Vị trí</a>
          <a href="#tien-ich" class="subnav-pill" data-anchor="secAmenities">Tiện ích</a>
          ${floorPlans.length ? `<a href="#mat-bang" class="subnav-pill" data-anchor="secFloorplan">Mặt bằng</a>` : ''}
          <a href="#chinh-sach" class="subnav-pill" data-anchor="secFinance">Chính sách &amp; Vay NH</a>
          ${(project.gallery || []).length ? `<a href="#thu-vien" class="subnav-pill" data-anchor="secGallery">Thư viện ảnh</a>` : ''}
          <a href="#dang-ky" class="subnav-pill" data-anchor="secProjectLead">Nhận bảng giá</a>
        </div>
      </div>
    </div>

    <!-- 1. TỔNG QUAN -->
    <section class="section" id="secOverview">
      <div class="container">
        <div class="overview-split reveal">
          <div>
            <span class="eyebrow">Tổng Quan Tuyệt Tác</span>
            <h2 class="section-title">${escapeHTML(project.name)}</h2>
            <p class="section-desc" style="white-space:pre-line;">${escapeHTML(project.summary || '')}</p>

            <ul class="highlights-list">
              ${(project.highlights || []).map((hl) => `
                <li>
                  <span class="check-badge">${ICONS.check}</span>
                  <span>${escapeHTML(hl)}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="specs-card">
            <h3 class="serif-heading" style="font-size:1.45rem;color:var(--color-primary);margin-bottom:14px;">Thông Số Kỹ Thuật Dự Án</h3>
            ${(project.specs || []).map((sp) => `
              <div class="specs-row">
                <span>${escapeHTML(sp.label)}</span>
                <strong>${escapeHTML(sp.value)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- 2. VỊ TRÍ & KẾT NỐI -->
    <section class="section section-alt" id="secLocation">
      <div class="container">
        <div class="location-grid reveal">
          <div>
            <span class="eyebrow">Tọa Độ Vàng Chiến Lược</span>
            <h2 class="section-title">Tâm Điểm Giao Thương &amp; Kết Nối Đa Chiều</h2>
            <p class="section-desc">${escapeHTML(project.location?.description || project.address || '')}</p>
            <p style="font-weight:600;color:var(--color-primary);margin-top:12px;">📍 ${escapeHTML(project.address || '')}</p>

            <div class="connection-cards">
              ${(project.location?.connections || []).map((c) => `
                <div class="connection-item">
                  <div class="connection-time">${escapeHTML(c.time)}</div>
                  <div>
                    <strong style="display:block;color:var(--color-primary);">${escapeHTML(c.place)}</strong>
                    <span style="font-size:0.85rem;color:var(--color-ink-muted);">${escapeHTML(c.detail || '')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="map-frame-wrap">
            <iframe src="${escapeHTML(mapSrc)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ vị trí ${escapeHTML(project.name)}"></iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. TIỆN ÍCH ĐẲNG CẤP -->
    <section class="section" id="secAmenities">
      <div class="container">
        <div class="section-header centered reveal">
          <span class="eyebrow">Hệ Sinh Thái Đặc Quyền</span>
          <h2 class="section-title">Tiện Ích Nghỉ Dưỡng Ngay Thềm Nhà</h2>
          <p class="section-desc">Trải nghiệm cuộc sống cân bằng trọn vẹn với chuỗi tiện ích nội khu được thiết kế riêng cho từng thế hệ cư dân.</p>
        </div>

        <div class="amenities-grid reveal">
          ${(project.amenities || []).map((am) => `
            <div class="amenity-card">
              ${am.image ? `<img src="${escapeHTML(resolveAsset(am.image))}" alt="${escapeHTML(am.title)}" class="amenity-card-img" loading="lazy" />` : ''}
              <div class="amenity-card-body">
                <div class="value-icon" style="width:46px;height:46px;margin-bottom:14px;">${ICONS[am.icon] || ICONS.sparkles}</div>
                <h3 style="font-size:1.2rem;color:var(--color-primary);margin-bottom:8px;">${escapeHTML(am.title)}</h3>
                <p style="margin:0;font-size:0.9rem;color:var(--color-ink-muted);">${escapeHTML(am.desc || '')}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 4. MẶT BẰNG & THIẾT KẾ -->
    ${floorPlans.length ? `
      <section class="section section-alt" id="secFloorplan">
        <div class="container">
          <div class="section-header reveal">
            <span class="eyebrow">Quy Hoạch &amp; Không Gian Tinh Tế</span>
            <h2 class="section-title">Mặt Bằng Điển Hình &amp; Thiết Kế Căn Hộ</h2>
          </div>

          <div class="floorplan-box reveal">
            <div class="filter-pills" id="fpTabs" style="margin-bottom:16px;">
              ${floorPlans.map((fp, idx) => `
                <button type="button" class="filter-pill ${idx === 0 ? 'active' : ''}" data-fp-idx="${idx}">
                  ${escapeHTML(fp.title)}
                </button>
              `).join('')}
            </div>

            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;color:var(--color-ink-muted);font-size:0.94rem;">
              <strong id="fpMetaArea" style="color:var(--color-primary);">${escapeHTML(floorPlans[0].area || '')}</strong>
              <span id="fpMetaSpecs">${escapeHTML(floorPlans[0].specs || '')}</span>
            </div>

            <div class="floorplan-stage" id="fpLightboxTrigger">
              <img id="fpMainImg" src="${escapeHTML(resolveAsset(floorPlans[0].image))}" alt="${escapeHTML(floorPlans[0].title)}" />
              <span class="zoom-hint">${ICONS.zoom} Nhấn để phóng to sơ đồ</span>
            </div>
          </div>
        </div>
      </section>
    ` : ''}

    <!-- 5. CHÍNH SÁCH THANH TOÁN & CÔNG CỤ TÍNH KHOẢN VAY MUA NHÀ -->
    <section class="section" id="secFinance">
      <div class="container">
        <div class="finance-grid reveal">
          <div>
            <span class="eyebrow">Giải Pháp Tài Chính Nhẹ Nhàng</span>
            <h2 class="section-title">Chính Sách Bán Hàng &amp; Tiến Độ Thanh Toán</h2>
            <p class="section-desc" style="margin-bottom:12px;">${escapeHTML(project.policies?.bankSupport || '')}</p>
            ${project.policies?.discountNote ? `
              <div style="padding:14px 18px;border-radius:18px;background:rgba(200,164,93,0.16);color:var(--color-primary);font-weight:600;font-size:0.92rem;">
                🎁 ${escapeHTML(project.policies.discountNote)}
              </div>
            ` : ''}

            <div class="milestone-timeline">
              ${(project.policies?.milestones || []).map((m) => `
                <div class="milestone-card">
                  <div class="milestone-pct">${escapeHTML(m.percent)}</div>
                  <div>
                    <div style="font-size:0.76rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-accent);font-weight:700;">${escapeHTML(m.step)}</div>
                    <strong style="display:block;color:var(--color-primary);font-size:1.02rem;">${escapeHTML(m.title)}</strong>
                    <span style="font-size:0.85rem;color:var(--color-ink-muted);">${escapeHTML(m.note || '')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- BẢNG TÍNH DÒNG TIỀN VAY NGÂN HÀNG TRỰC QUAN -->
          <div class="loan-calculator">
            <span class="eyebrow" style="background:rgba(255,255,255,0.14);color:var(--color-accent-soft);">Công Cụ Ước Tính Dòng Tiền</span>
            <h3 class="serif-heading" style="font-size:1.75rem;margin:6px 0 18px;color:#FFFFFF;">Tính Khoản Trả Góp Ngân Hàng</h3>

            <div class="loan-slider-group">
              <div class="loan-slider-label">
                <span>Giá trị BĐS ước tính</span>
                <strong id="calcPriceVal">${basePrice.toFixed(1)} tỷ VNĐ</strong>
              </div>
              <input type="range" id="calcPriceRange" class="loan-range" min="2" max="45" step="0.2" value="${basePrice}" />
            </div>

            <div class="loan-slider-group">
              <div class="loan-slider-label">
                <span>Tỷ lệ vay ngân hàng</span>
                <strong id="calcRatioVal">65%</strong>
              </div>
              <input type="range" id="calcRatioRange" class="loan-range" min="20" max="80" step="5" value="65" />
            </div>

            <div class="loan-slider-group">
              <div class="loan-slider-label">
                <span>Thời hạn vay</span>
                <strong id="calcYearsVal">20 năm</strong>
              </div>
              <input type="range" id="calcYearsRange" class="loan-range" min="5" max="30" step="1" value="20" />
            </div>

            <div class="loan-slider-group">
              <div class="loan-slider-label">
                <span>Lãi suất tham khảo / năm</span>
                <strong id="calcRateVal">7.5%/năm</strong>
              </div>
              <input type="range" id="calcRateRange" class="loan-range" min="5" max="12" step="0.2" value="7.5" />
            </div>

            <div class="loan-result-box">
              <div class="loan-result-item">
                <span>Vốn tự có ban đầu</span>
                <strong id="calcEquityOut">—</strong>
              </div>
              <div class="loan-result-item">
                <span>Ngân hàng giải ngân</span>
                <strong id="calcLoanOut">—</strong>
              </div>
              <div class="loan-result-item" style="grid-column:1/-1;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15);">
                <span>Gốc + lãi tháng đầu ước tính (dư nợ giảm dần)</span>
                <strong id="calcMonthlyOut" style="font-size:1.75rem;">—</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. THƯ VIỆN HÌNH ẢNH -->
    ${(project.gallery || []).length ? `
      <section class="section section-alt" id="secGallery">
        <div class="container">
          <div class="section-header centered reveal">
            <span class="eyebrow">Cảm Hứng Không Gian Sống</span>
            <h2 class="section-title">Thư Viện Phối Cảnh &amp; Thực Tế</h2>
          </div>

          <div class="gallery-grid reveal">
            ${project.gallery.map((g) => `
              <div class="gallery-item" data-lightbox-src="${escapeHTML(resolveAsset(g.url))}" data-lightbox-cap="${escapeHTML(g.caption || project.name)}">
                <img src="${escapeHTML(resolveAsset(g.url))}" alt="${escapeHTML(g.caption || project.name)}" loading="lazy" />
                ${g.caption ? `<div class="gallery-caption">${escapeHTML(g.caption)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    ` : ''}

    <!-- 7. ĐĂNG KÝ NHẬN BẢNG GIÁ DỰ ÁN -->
    <section class="section" id="secProjectLead">
      <div class="container">
        <div class="consult-banner reveal">
          <div>
            <span class="eyebrow" style="background:rgba(255,255,255,0.15);color:var(--color-accent-soft);">Giỏ Hàng Độc Quyền Chủ Đầu Tư</span>
            <h2 class="section-title" style="color:#FFFFFF;margin-top:8px;">Nhận Bảng Giá Chi Tiết Dự Án ${escapeHTML(project.name)}</h2>
            <p style="color:rgba(255,255,255,0.85);">
              Đăng ký ngay để nhận file PDF Mặt bằng từng tầng, Bảng tính dòng tiền chi tiết từng căn và lịch mở bán ưu tiên mới nhất.
            </p>
          </div>
          <div class="consult-form-card">
            <form id="projectDetailLeadForm" class="form-grid">
              <input type="hidden" name="project" value="${escapeHTML(project.name)}" />
              <input type="text" name="fullName" class="form-input" placeholder="Họ và tên Quý khách *" required />
              <input type="tel" name="phone" class="form-input" placeholder="Số điện thoại / Zalo nhận file PDF *" required />
              <input type="email" name="email" class="form-input" placeholder="Email nhận Brochure (tùy chọn)" />
              <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;">
                Nhận Trọn Bộ Tài Liệu ${escapeHTML(project.name)}
              </button>
            </form>
            <div id="projectDetailLeadFeedback" style="display:none;margin-top:14px;"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Gắn sự kiện Subnav cuộn mượt (không làm nhảy Hash Router)
  root.querySelectorAll('[data-anchor]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-anchor');
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Tabs mặt bằng
  let currentFpIdx = 0;
  root.querySelectorAll('[data-fp-idx]').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentFpIdx = Number(tab.getAttribute('data-fp-idx'));
      const fp = floorPlans[currentFpIdx];
      if (!fp) return;
      root.querySelectorAll('#fpTabs .filter-pill').forEach((b) => b.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('fpMainImg').src = resolveAsset(fp.image);
      document.getElementById('fpMetaArea').textContent = fp.area || '';
      document.getElementById('fpMetaSpecs').textContent = fp.specs || '';
    });
  });

  document.getElementById('fpLightboxTrigger')?.addEventListener('click', () => {
    const fp = floorPlans[currentFpIdx];
    if (fp) openLightbox(resolveAsset(fp.image), `${project.name} — ${fp.title}`);
  });

  root.querySelectorAll('[data-lightbox-src]').forEach((el) => {
    el.addEventListener('click', () => {
      openLightbox(el.getAttribute('data-lightbox-src'), el.getAttribute('data-lightbox-cap'));
    });
  });

  root.querySelectorAll('[data-open-consult]').forEach((btn) => {
    btn.addEventListener('click', () => openConsultModal(btn.getAttribute('data-open-consult')));
  });

  // Gắn máy tính khoản vay
  const updateLoanCalc = () => {
    const priceB = parseFloat(document.getElementById('calcPriceRange')?.value || basePrice);
    const ratio = parseFloat(document.getElementById('calcRatioRange')?.value || 65);
    const years = parseInt(document.getElementById('calcYearsRange')?.value || 20, 10);
    const rate = parseFloat(document.getElementById('calcRateRange')?.value || 7.5);

    document.getElementById('calcPriceVal').textContent = `${priceB.toFixed(1)} tỷ VNĐ`;
    document.getElementById('calcRatioVal').textContent = `${ratio}%`;
    document.getElementById('calcYearsVal').textContent = `${years} năm`;
    document.getElementById('calcRateVal').textContent = `${rate.toFixed(1)}%/năm`;

    const loanB = (priceB * ratio) / 100;
    const equityB = priceB - loanB;
    const months = years * 12;
    const principalMillionPerMonth = (loanB * 1000) / months;
    const firstInterestMillion = (loanB * 1000) * (rate / 100 / 12);
    const totalFirstMonth = principalMillionPerMonth + firstInterestMillion;

    document.getElementById('calcEquityOut').textContent = `${equityB.toFixed(2)} tỷ`;
    document.getElementById('calcLoanOut').textContent = `${loanB.toFixed(2)} tỷ`;
    document.getElementById('calcMonthlyOut').textContent = `~${totalFirstMonth.toFixed(1)} triệu/tháng`;
  };
  ['calcPriceRange', 'calcRatioRange', 'calcYearsRange', 'calcRateRange'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateLoanCalc);
  });
  updateLoanCalc();

  const detailForm = document.getElementById('projectDetailLeadForm');
  if (detailForm) {
    detailForm.addEventListener('submit', (e) => handleLeadSubmit(e, detailForm, 'projectDetailLeadFeedback'));
  }

  setupScrollReveal();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ================= TRANG CHI TIẾT TIN TỨC ================= */
function renderNewsDetailPage(slug) {
  clearInterval(heroTimer);
  const article = (siteData.news || []).find((n) => n.slug === slug);
  const root = document.getElementById('appRoot');

  if (!article) {
    root.innerHTML = `
      <section class="section" style="padding-top:160px;text-align:center;">
        <div class="container">
          <h2 class="section-title">Bài viết không tồn tại</h2>
          <a href="#/" class="btn btn-primary">Về trang chủ</a>
        </div>
      </section>
    `;
    return;
  }

  const relatedProj = (siteData.projects || []).find((p) => p.slug === article.relatedProjectSlug) || siteData.projects?.[0];

  root.innerHTML = `
    <section class="section news-detail-section">
      <div class="container" style="max-width:880px;">
        <a href="#/" class="btn btn-soft" style="margin-bottom:24px;">← Quay lại Tin tức</a>
        <div class="news-meta">${escapeHTML(article.category || 'Tin thị trường')} • ${escapeHTML(article.date || '')} • ${escapeHTML(article.readTime || '4 phút đọc')}</div>
        <h1 class="section-title" style="font-size:clamp(1.75rem,3.6vw,2.85rem);margin-bottom:22px;">${escapeHTML(article.title)}</h1>
        <img src="${escapeHTML(resolveAsset(article.image || './assets/images/hero-emerald-residences.jpg'))}" alt="${escapeHTML(article.title)}"
             class="news-detail-hero-img" />
        <div class="news-article-body">
          ${escapeHTML(article.content || article.excerpt || '')}
        </div>

        ${relatedProj ? `
          <div class="news-related-banner">
            <div>
              <span class="eyebrow" style="margin-bottom:6px;">Dự Án Tâm Điểm Liên Quan</span>
              <h3 class="serif-heading" style="font-size:1.45rem;color:var(--color-primary);">${escapeHTML(relatedProj.name)}</h3>
              <p style="margin:4px 0 0;color:var(--color-ink-muted);">${escapeHTML(relatedProj.priceDisplay)} • ${escapeHTML(relatedProj.locationShort)}</p>
            </div>
            <a href="#/du-an/${encodeURIComponent(relatedProj.slug)}" class="btn btn-primary">Xem chi tiết dự án ${ICONS.arrowRight}</a>
          </div>
        ` : ''}
      </div>
    </section>
  `;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ================= XỬ LÝ FORM TƯ VẤN & LIGHTBOX ================= */
function openConsultModal(projectTitle = 'Nhận Bảng Giá & Mặt Bằng Chi Tiết') {
  const modal = document.getElementById('consultModal');
  const titleEl = document.getElementById('modalProjectTitle');
  const inputEl = document.getElementById('modalProjectInput');
  const formEl = document.getElementById('modalConsultForm');
  const successEl = document.getElementById('modalConsultSuccess');

  if (titleEl) titleEl.textContent = projectTitle;
  if (inputEl) inputEl.value = projectTitle;
  if (formEl) formEl.style.display = 'grid';
  if (successEl) successEl.style.display = 'none';
  modal?.classList.add('open');
}

function openLightbox(src, caption = '') {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  if (img) img.src = src;
  if (cap) cap.textContent = caption;
  modal?.classList.add('open');
}

async function handleLeadSubmit(event, formEl, feedbackId) {
  event.preventDefault();
  const fd = new FormData(formEl);
  const payload = Object.fromEntries(fd.entries());
  saveLocalLead(payload);

  const webhook = siteData?.brand?.leadWebhookUrl;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, submittedAt: new Date().toISOString() })
      });
    } catch {
      // Vẫn hiển thị xác nhận kèm nút Zalo trực tiếp
    }
  }

  const zaloNum = cleanPhone(siteData?.brand?.zalo || siteData?.brand?.hotline);
  const feedbackEl = document.getElementById(feedbackId);

  if (formEl.id === 'modalConsultForm') {
    formEl.style.display = 'none';
    const box = document.getElementById('modalConsultSuccess');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="font-size:2.4rem;margin-bottom:8px;">✨</div>
        <h4 style="font-size:1.35rem;color:var(--color-primary);margin-bottom:8px;">Đã Ghi Nhận Yêu Cầu Của Quý Khách!</h4>
        <p style="color:var(--color-ink-muted);font-size:0.92rem;margin-bottom:18px;">
          Chuyên viên tư vấn sẽ liên hệ tới số <strong>${escapeHTML(payload.phone)}</strong> ngay ít phút tới. Hoặc Quý khách có thể nhận file PDF ngay qua Zalo:
        </p>
        <a href="https://zalo.me/${zaloNum}" target="_blank" rel="noopener" class="btn btn-primary">
          Mở Zalo nhận Bảng giá tức thì
        </a>
      `;
    }
  } else if (feedbackEl) {
    formEl.reset();
    feedbackEl.style.display = 'block';
    feedbackEl.innerHTML = `
      <div style="padding:14px 16px;border-radius:16px;background:#E6F4EE;color:#0E3A2F;font-size:0.9rem;font-weight:600;">
        ✓ Cảm ơn ${escapeHTML(payload.fullName)}! Chúng tôi đã ghi nhận thông tin và sẽ gửi bảng giá sớm nhất.
      </div>
    `;
  }
}

/* ================= ROUTER & KHỞI ĐỘNG ================= */
function handleRoute() {
  if (!siteData) return;
  const hash = window.location.hash || '#/';

  if (hash.startsWith('#/du-an/')) {
    const slug = decodeURIComponent(hash.replace('#/du-an/', '').trim());
    renderProjectDetailPage(slug);
    return;
  }

  if (hash.startsWith('#/tin-tuc/')) {
    const slug = decodeURIComponent(hash.replace('#/tin-tuc/', '').trim());
    renderNewsDetailPage(slug);
    return;
  }

  renderHomePage();

  const sectionMap = {
    '#/gioi-thieu': 'aboutSection',
    '#/du-an': 'projectsSection',
    '#/gia-tri': 'valuesSection',
    '#/tin-tuc': 'newsSection',
    '#/lien-he': 'consultSection'
  };

  if (sectionMap[hash]) {
    setTimeout(() => {
      document.getElementById(sectionMap[hash])?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  }
}

function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function setupGlobalEvents() {
  const headerEl = document.getElementById('siteHeader');
  const navLinksEl = document.getElementById('navLinks');
  const HIDE_OFFSET = 72;
  const DELTA_HIDE = 10;
  const DELTA_SHOW = 8;

  let lastScrollY = Math.max(0, window.scrollY);
  let downDistance = 0;
  let upDistance = 0;
  let scrollTicking = false;

  const setHeaderHidden = (hidden) => {
    headerEl?.classList.toggle('header-hidden', hidden);
    document.body.classList.toggle('header-hidden', hidden);
    if (hidden) {
      navLinksEl?.classList.remove('mobile-open');
      const mBtn = document.getElementById('mobileMenuBtn');
      if (mBtn) {
        mBtn.textContent = '☰';
        mBtn.setAttribute('aria-expanded', 'false');
      }
    }
  };

  const updateHeaderOnScroll = () => {
    scrollTicking = false;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const currentY = maxScroll > 0
      ? Math.min(Math.max(0, window.scrollY), maxScroll)
      : Math.max(0, window.scrollY);
    const diff = currentY - lastScrollY;
    lastScrollY = currentY;

    headerEl?.classList.toggle('scrolled', currentY > 36);

    if (currentY <= HIDE_OFFSET) {
      setHeaderHidden(false);
      downDistance = 0;
      upDistance = 0;
      return;
    }

    if (diff > 0) {
      downDistance += diff;
      upDistance = 0;
      if (downDistance >= DELTA_HIDE) {
        setHeaderHidden(true);
      }
    } else if (diff < 0) {
      upDistance += -diff;
      downDistance = 0;
      if (upDistance >= DELTA_SHOW) {
        setHeaderHidden(false);
      }
    }
  };

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updateHeaderOnScroll);
    }
  }, { passive: true });

  headerEl?.addEventListener('focusin', () => setHeaderHidden(false));

  window.addEventListener('hashchange', handleRoute);

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const closeMobileMenu = () => {
    navLinksEl?.classList.remove('mobile-open');
    if (mobileMenuBtn) {
      mobileMenuBtn.textContent = '☰';
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
  };

  mobileMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinksEl?.classList.toggle('mobile-open');
    mobileMenuBtn.textContent = isOpen ? '✕' : '☰';
    mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.querySelectorAll('#navLinks .nav-link').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('click', (e) => {
    if (navLinksEl?.classList.contains('mobile-open') && !e.target.closest('.header-inner')) {
      closeMobileMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      document.getElementById('consultModal')?.classList.remove('open');
      document.getElementById('lightboxModal')?.classList.remove('open');
    }
  });

  document.getElementById('openQuickConsultBtn')?.addEventListener('click', () => {
    openConsultModal('Nhận Bảng Giá & Chính Sách Ưu Đãi');
  });

  document.getElementById('closeConsultModal')?.addEventListener('click', () => {
    document.getElementById('consultModal')?.classList.remove('open');
  });

  document.getElementById('closeLightboxBtn')?.addEventListener('click', () => {
    document.getElementById('lightboxModal')?.classList.remove('open');
  });

  ['consultModal', 'lightboxModal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) e.currentTarget.classList.remove('open');
    });
  });

  const modalForm = document.getElementById('modalConsultForm');
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => handleLeadSubmit(e, modalForm, 'modalConsultSuccess'));
  }

  // Lắng nghe cập nhật tức thì từ iframe Live Preview của BDS Studio App
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'BDS_STUDIO_LIVE_PREVIEW' && event.data?.payload) {
      const pending = await getAllPendingUploads();
      resolveAsset = createAssetResolver(pending);
      siteData = event.data.payload;
      syncChrome();
      if (event.data.targetRoute && window.location.hash !== event.data.targetRoute) {
        window.location.hash = event.data.targetRoute;
      } else {
        handleRoute();
      }
    }
  });
}

(async function init() {
  try {
    await loadInitialData();
    syncChrome();
    setupGlobalEvents();
    handleRoute();
  } catch (err) {
    console.error(err);
  }
})();
