// Bộ bảng màu thương hiệu BĐS cao cấp (có thể đổi 1-Click trong BDS Studio)
export const THEME_PRESETS = {
  'emerald-champagne': {
    name: 'Hưng Lộc Phát — Ngọc Lục Bảo & Vàng Champagne',
    primary: '#0E3A2F',
    primarySoft: '#175445',
    accent: '#C8A45D',
    accentSoft: '#E6C987',
    surface: '#FAF8F4',
    surfaceAlt: '#F2EDE3'
  },
  'royal-sapphire': {
    name: 'Royal Marina — Xanh Sapphire & Ánh Kim',
    primary: '#122B49',
    primarySoft: '#1D416E',
    accent: '#CFA65B',
    accentSoft: '#EAD09B',
    surface: '#F8F9FC',
    surfaceAlt: '#EEF1F7'
  },
  'mediterranean-terra': {
    name: 'Địa Trung Hải — Đất Nung Ấm & Cát Trắng',
    primary: '#6B3326',
    primarySoft: '#8A4535',
    accent: '#C9985A',
    accentSoft: '#E5C391',
    surface: '#FCF9F5',
    surfaceAlt: '#F4ECE2'
  },
  'botanical-sage': {
    name: 'Eco Retreat — Xanh Rừng Nhiệt Đới & Đồng Cổ',
    primary: '#233F32',
    primarySoft: '#335B49',
    accent: '#B88B58',
    accentSoft: '#DEC09A',
    surface: '#F7F8F4',
    surfaceAlt: '#ECEFE6'
  },
  'obsidian-penthouse': {
    name: 'Penthouse Bespoke — Đen Than Chì & Vàng 24K',
    primary: '#191D24',
    primarySoft: '#2A303C',
    accent: '#CEA559',
    accentSoft: '#E8CA8D',
    surface: '#FAF9F6',
    surfaceAlt: '#F0EDE6'
  }
};

// Thư viện Tiện ích BĐS chọn nhanh bằng 1 cú nhấp trong BDS Studio
export const AMENITY_LIBRARY = [
  {
    icon: 'waves',
    title: 'Hồ Bơi Khoáng Muối Vô Cực',
    desc: 'Công nghệ điện phân muối tự nhiên an toàn cho sức khỏe, tích hợp ghế thư giãn chìm Sunken Lounge.'
  },
  {
    icon: 'trees',
    title: 'Công Viên Ven Sông & Đường Dạo Bộ',
    desc: 'Không gian sinh thái rợp bóng cây cổ thụ, thảm cỏ dã ngoại và đường chạy bộ lát đá tự nhiên.'
  },
  {
    icon: 'sparkles',
    title: 'Sky Lounge & Vườn Thượng Uyển Chân Mây',
    desc: 'Thưởng ngoạn toàn cảnh thành phố 360 độ từ tầng thượng cùng quầy rượu vang tinh tế.'
  },
  {
    icon: 'heart',
    title: 'Tổ Hợp Onsen Khoáng Nóng & Wellness Spa',
    desc: 'Chăm sóc và phục hồi năng lượng chuyên sâu chuẩn Nhật Bản dành riêng cho cư dân.'
  },
  {
    icon: 'anchor',
    title: 'Bến Du Thuyền Nội Khu & Clubhouse 5 Sao',
    desc: 'Sảnh đón trần cao sang trọng kết nối trực tiếp bến cano và du thuyền ven sông.'
  },
  {
    icon: 'sun',
    title: 'Trường Mầm Non Quốc Tế & Khu Vui Chơi Trẻ Em',
    desc: 'Môi trường phát triển trí tuệ và thể chất an toàn khép kín ngay trong khuôn viên dự án.'
  },
  {
    icon: 'shield',
    title: 'An Ninh Đa Lớp & Smart Living 24/7',
    desc: 'Nhận diện khuôn mặt FaceID, sảnh thang máy phân tầng và đội ngũ Concierge tận tâm.'
  },
  {
    icon: 'compass',
    title: 'Phòng Gym Panorama & Golf 3D Thượng Lưu',
    desc: 'Trang bị hệ thống máy tập Technogym hiện đại hướng thẳng ra mặt hồ trung tâm.'
  },
  {
    icon: 'leaf',
    title: 'Vườn Thiền Zen & Thư Viện Đọc Sách',
    desc: 'Góc tĩnh lặng cân bằng tâm trí giữa tiếng suối chảy hiền hòa và hương thảo mộc.'
  },
  {
    icon: 'building',
    title: 'Đại Lộ Thương Mại Boutique Shophouse',
    desc: 'Quy tụ chuỗi nhà hàng Âu – Á, café đặc sản, siêu thị hữu cơ và dịch vụ cao cấp.'
  }
];

// 4 Mẫu khung dự án khởi tạo nhanh giúp giảm 80% thời gian nhập liệu
export const PROJECT_TEMPLATES = {
  condo: {
    label: 'Căn hộ sinh thái hạng sang',
    category: 'Căn hộ hạng sang',
    status: 'Đang mở bán',
    tagline: 'Tuyệt tác căn hộ xanh kiến trúc hữu cơ giữa lòng đô thị',
    priceDisplay: 'Từ 65 triệu/m²',
    numericPriceBillion: 5.2,
    areaRange: '55m² – 145m² (1PN – 3PN & Penthouse)',
    heroImage: './assets/images/hero-emerald-residences.jpg',
    highlights: [
      'Mật độ xây dựng thấp dưới 28%, ưu tiên mảng xanh & mặt nước',
      'Ban công kính cong Panorama đón gió và ánh sáng tự nhiên',
      'Thanh toán chỉ 20% đến khi nhận bàn giao căn hộ',
      'Pháp lý minh bạch — Sổ hồng sở hữu lâu dài'
    ],
    specs: [
      { label: 'Chủ đầu tư', value: 'Hưng Lộc Phát Luxury' },
      { label: 'Tổng diện tích', value: '3,8 ha' },
      { label: 'Mật độ xây dựng', value: '27,5%' },
      { label: 'Quy mô', value: '2 Tháp cao 32 tầng • 680 căn hộ cao cấp' },
      { label: 'Tiêu chuẩn bàn giao', value: 'Nội thất liền tường cao cấp Châu Âu' },
      { label: 'Pháp lý', value: 'Sổ hồng sở hữu lâu dài' },
      { label: 'Dự kiến bàn giao', value: 'Quý IV / 2027' }
    ],
    amenities: AMENITY_LIBRARY.slice(0, 4),
    milestones: [
      { step: 'Đợt 1', title: 'Ký Hợp đồng mua bán', percent: '15%', note: 'Ngay khi ký HĐMB' },
      { step: 'Đợt 2', title: 'Thanh toán giãn cách theo tháng', percent: '5%', note: 'Nhẹ nhàng dòng tiền' },
      { step: 'Đợt 3', title: 'Nhận bàn giao căn hộ', percent: '75%', note: 'Ngân hàng hỗ trợ lãi suất 0%' },
      { step: 'Đợt 4', title: 'Nhận Sổ hồng', percent: '5%', note: 'Sở hữu lâu dài' }
    ]
  },
  villa: {
    label: 'Biệt thự & Khu đô thị ven sông',
    category: 'Biệt thự & Khu đô thị',
    status: 'Sắp ra mắt',
    tagline: 'Khu dinh thự compound biệt lập bên dòng sông sinh thái',
    priceDisplay: 'Từ 16,8 tỷ/căn',
    numericPriceBillion: 16.8,
    areaRange: '200m² – 450m² (Song lập & Đơn lập)',
    heroImage: './assets/images/project-riverside-villas.jpg',
    highlights: [
      'Compound an ninh khép kín 24/7 bên bờ sông tự nhiên',
      'Sân vườn riêng và chỗ đậu 2 ô tô ngay tại từng dinh thự',
      'Clubhouse 5 sao, bến du thuyền và công viên trung tâm',
      'Sổ hồng riêng từng căn — Tài sản truyền đời bền vững'
    ],
    specs: [
      { label: 'Chủ đầu tư', value: 'Hưng Lộc Phát Luxury' },
      { label: 'Quy mô khu đất', value: '8,5 ha ven sông' },
      { label: 'Mật độ xây dựng', value: '22%' },
      { label: 'Loại hình sản phẩm', value: 'Biệt thự Song lập, Đơn lập & Dinh thự ven sông' },
      { label: 'Kết cấu xây dựng', value: '1 Trệt + 2 Lầu + Sân thượng vườn' },
      { label: 'Pháp lý', value: 'Sổ hồng lâu dài' },
      { label: 'Dự kiến bàn giao', value: 'Quý III / 2027' }
    ],
    amenities: [AMENITY_LIBRARY[4], AMENITY_LIBRARY[1], AMENITY_LIBRARY[6], AMENITY_LIBRARY[7]],
    milestones: [
      { step: 'Đợt 1', title: 'Ký Văn bản thỏa thuận / HĐMB', percent: '15%', note: 'Chọn vị trí đẹp ven sông' },
      { step: 'Đợt 2', title: 'Hoàn thành phần thô', percent: '15%', note: 'Sau 6 tháng' },
      { step: 'Đợt 3', title: 'Bàn giao biệt thự', percent: '65%', note: 'Ân hạn gốc & lãi 24 tháng' },
      { step: 'Đợt 4', title: 'Trao Sổ hồng', percent: '5%', note: 'Hoàn tất pháp lý' }
    ]
  },
  resort: {
    label: 'BĐS Nghỉ dưỡng biển & Shophouse',
    category: 'Nghỉ dưỡng biển',
    status: 'Đang triển khai',
    tagline: 'Tổ hợp biệt thự nghỉ dưỡng mặt biển & đại lộ thương mại bốn mùa',
    priceDisplay: 'Từ 11,5 tỷ/căn',
    numericPriceBillion: 11.5,
    areaRange: '150m² – 320m² (Beach Villa & Shophouse)',
    heroImage: './assets/images/project-coastal-retreat.jpg',
    highlights: [
      'Địa thế giật cấp hướng biển 100% tầm nhìn Panorama',
      'Bàn giao hoàn thiện full nội thất chuẩn Resort 5 sao',
      'Chia sẻ 85% lợi nhuận vận hành & tặng 30 đêm nghỉ/năm',
      'Kết nối trực tiếp cao tốc & sân bay chỉ từ 15 phút'
    ],
    specs: [
      { label: 'Chủ đầu tư', value: 'Hưng Lộc Phát Luxury' },
      { label: 'Quy mô', value: '25 ha mặt biển riêng tư' },
      { label: 'Sản phẩm', value: 'Beachfront Villa, Ocean Shophouse & Boutique Hotel' },
      { label: 'Đơn vị vận hành', value: 'Thương hiệu Quản lý Khách sạn Quốc tế' },
      { label: 'Bàn giao vận hành', value: 'Quý IV / 2027' }
    ],
    amenities: [AMENITY_LIBRARY[0], AMENITY_LIBRARY[3], AMENITY_LIBRARY[9]],
    milestones: [
      { step: 'Đợt 1', title: 'Ký Hợp đồng', percent: '15%', note: 'Xác nhận căn hướng biển' },
      { step: 'Đợt 2', title: 'Theo tiến độ thi công', percent: '15%', note: 'Chia 5 đợt nhỏ' },
      { step: 'Đợt 3', title: 'Bàn giao vận hành khai thác', percent: '65%', note: 'Nhận dòng tiền tự động' },
      { step: 'Đợt 4', title: 'Hoàn tất thủ tục', percent: '5%', note: 'Theo quy định' }
    ]
  },
  land: {
    label: 'Đất nền quy hoạch chuẩn & Nhà phố',
    category: 'Đất nền & Shophouse',
    status: 'Đang mở bán',
    tagline: 'Khu đô thị thương mại quy hoạch đồng bộ — Pháp lý sổ đỏ trao tay',
    priceDisplay: 'Từ 38 triệu/m²',
    numericPriceBillion: 3.8,
    areaRange: '100m² – 160m² (5x20m, 6x22m, 8x20m)',
    heroImage: './assets/images/project-riverside-villas.jpg',
    highlights: [
      'Hạ tầng hoàn thiện 100%: điện âm, nước máy, đường nhựa 16m–32m',
      'Sổ đỏ riêng từng nền — Công chứng sang tên ngay',
      'Liền kề trung tâm hành chính, chợ, trường học các cấp',
      'Ngân hàng thẩm định hỗ trợ vay lên đến 70%'
    ],
    specs: [
      { label: 'Đơn vị phát triển', value: 'Hưng Lộc Phát Luxury' },
      { label: 'Quy mô', value: '12,6 ha • 380 nền nhà phố & shophouse' },
      { label: 'Lộ giới nội khu', value: '13m – 20m – 32m vỉa hè cây xanh' },
      { label: 'Pháp lý', value: 'Sổ đỏ riêng từng nền • Thổ cư 100%' },
      { label: 'Xây dựng', value: 'Tự do theo quy chuẩn đô thị văn minh' }
    ],
    amenities: [AMENITY_LIBRARY[1], AMENITY_LIBRARY[5], AMENITY_LIBRARY[9]],
    milestones: [
      { step: 'Đợt 1', title: 'Đặt cọc giữ nền', percent: '100 triệu', note: 'Bổ sung đủ trong 24h' },
      { step: 'Đợt 2', title: 'Công chứng chuyển nhượng', percent: '95%', note: 'Trong vòng 15–30 ngày' },
      { step: 'Đợt 3', title: 'Nhận Sổ đỏ cập nhật sang tên', percent: '5%', note: 'An tâm tuyệt đối' }
    ]
  }
};

// Chuyển Tiếng Việt có dấu sang đường dẫn thân thiện SEO (slug)
export function slugifyVN(text = '') {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Bộ icon SVG tinh mảnh mang hơi thở kiến trúc cao cấp
export const ICONS = {
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
  waves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
  trees: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  anchor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  zoom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>`
};
