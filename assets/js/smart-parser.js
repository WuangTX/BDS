import { AMENITY_LIBRARY, PROJECT_TEMPLATES, slugifyVN } from './default-data.js';

/**
 * Văn bản mẫu để người dùng thử tính năng "Dán nhanh thông tin dự án từ Zalo / Word" chỉ bằng 1 click
 */
export const SAMPLE_RAW_PROJECT_TEXT = `Tên dự án: The Lotus Marina Nam Sài Gòn
Phân loại: Căn hộ hạng sang
Trạng thái: Đang mở bán
Slogan: Biểu tượng căn hộ vườn nhiệt đới bên bến du thuyền Quận 7
Vị trí: Mặt tiền đường Đào Trí, Phường Phú Thuận, Quận 7, TP. Hồ Chí Minh
Chủ đầu tư: Tập đoàn Hưng Lộc Phát Luxury
Quy mô: 4,6 ha gồm 2 tháp cao 36 tầng - 760 căn hộ & Sky Villa
Mật độ xây dựng: 25,4%
Diện tích: 56m² – 142m² (1PN, 2PN, 3PN & Penthouse)
Giá bán: Từ 69 triệu/m² (khoảng 5.4 tỷ/căn)
Pháp lý: Sổ hồng sở hữu lâu dài
Bàn giao: Quý III / 2028
Ngân hàng: Vietcombank bảo lãnh & hỗ trợ vay 70%, ân hạn gốc lãi 24 tháng
Ưu đãi: Chiết khấu thanh toán nhanh lên tới 9% + Tặng gói nội thất Smarthome
Điểm nhấn:
- Trực diện khúc sông Sài Gòn rộng 1,2km thoáng mát quanh năm
- Hồ bơi khoáng muối vô cực trên không kết nối hai tòa tháp
- Chỉ thanh toán 15% ký HĐMB, giãn tiến độ 0.8%/tháng
- Bàn giao thiết bị bếp Hafele, vệ sinh Duravit nhập khẩu Đức
Kết nối:
- 05 phút | Khu đô thị Phú Mỹ Hưng | Crescent Mall, Bệnh viện FV, Trường quốc tế
- 10 phút | Khu đô thị mới Thủ Thiêm | Qua quy hoạch Cầu Thủ Thiêm 4
- 15 phút | Trung tâm Quận 1 | Phố đi bộ Nguyễn Huệ, Bến Bạch Đằng
Mô tả: The Lotus Marina là tuyệt tác căn hộ sinh thái ven sông tọa lạc trên cung đường tỷ đô Đào Trí Quận 7. Thiết kế đường cong lấy cảm hứng từ cánh sen mềm mại giúp 100% căn hộ đều sở hữu tầm nhìn thoáng rộng hướng sông và công viên nội khu 2,4ha.`;

/**
 * Tự động bóc tách thông tin thô tiếng Việt thành cấu trúc dự án hoàn chỉnh
 */
export function parseSmartProjectText(rawText = '') {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const extractField = (patterns) => {
    for (const line of lines) {
      for (const regex of patterns) {
        const match = line.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    return '';
  };

  const name =
    extractField([
      /^(?:tên dự án|dự án|project)\s*[:\-–]\s*(.+)$/i
    ]) || (lines[0] && !lines[0].includes(':') ? lines[0].replace(/^[#*•\-]+\s*/, '') : 'Dự Án BĐS Mới');

  const rawCategory = extractField([/^(?:phân loại|loại hình|phân khúc)\s*[:\-–]\s*(.+)$/i]);
  let category = 'Căn hộ hạng sang';
  let templateKey = 'condo';
  const catCheck = `${name} ${rawCategory} ${rawText}`.toLowerCase();
  if (catCheck.includes('biệt thự') || catCheck.includes('villa') || catCheck.includes('dinh thự') || catCheck.includes('compound')) {
    category = 'Biệt thự & Khu đô thị';
    templateKey = 'villa';
  } else if (catCheck.includes('nghỉ dưỡng') || catCheck.includes('resort') || catCheck.includes('biển') || catCheck.includes('condotel')) {
    category = 'Nghỉ dưỡng biển';
    templateKey = 'resort';
  } else if (catCheck.includes('đất nền') || catCheck.includes('sổ đỏ')) {
    category = 'Đất nền & Shophouse';
    templateKey = 'land';
  }

  const tpl = PROJECT_TEMPLATES[templateKey];

  const statusRaw = extractField([/^(?:trạng thái|tình trạng|mở bán)\s*[:\-–]\s*(.+)$/i]);
  let status = tpl.status;
  if (/sắp/i.test(statusRaw)) status = 'Sắp ra mắt';
  else if (/bàn giao|hoàn thành/i.test(statusRaw)) status = 'Đã bàn giao';
  else if (/triển khai/i.test(statusRaw)) status = 'Đang triển khai';
  else if (/mở bán/i.test(statusRaw)) status = 'Đang mở bán';

  const tagline =
    extractField([/^(?:slogan|thông điệp|điểm tựa|tagline)\s*[:\-–]\s*(.+)$/i]) || tpl.tagline;

  const address =
    extractField([/^(?:vị trí|địa chỉ|tọa lạc)\s*[:\-–]\s*(.+)$/i]) || 'Trung tâm khu đô thị mới, TP. Hồ Chí Minh';

  // Rút gọn khu vực hiển thị trên thẻ dự án
  const addressParts = address.split(',').map((s) => s.trim()).filter(Boolean);
  const locationShort = addressParts.length >= 2
    ? addressParts.slice(-2).join(', ')
    : address;

  const developer = extractField([/^(?:chủ đầu tư|đơn vị phát triển|cđt)\s*[:\-–]\s*(.+)$/i]) || 'Hưng Lộc Phát Luxury';
  const scale = extractField([/^(?:quy mô|tổng diện tích)\s*[:\-–]\s*(.+)$/i]) || '4,2 ha • Khu phức hợp xanh cao cấp';
  const density = extractField([/^(?:mật độ xây dựng|mật độ)\s*[:\-–]\s*(.+)$/i]) || '26,5%';
  const areaRange = extractField([/^(?:diện tích|loại căn|cơ cấu diện tích)\s*[:\-–]\s*(.+)$/i]) || tpl.areaRange;
  const priceRaw = extractField([/^(?:giá bán|giá tham khảo|giá từ|đơn giá|giá)\s*[:\-–]\s*(.+)$/i]) || tpl.priceDisplay;
  const legal = extractField([/^(?:pháp lý|sở hữu)\s*[:\-–]\s*(.+)$/i]) || 'Sổ hồng sở hữu lâu dài';
  const handover = extractField([/^(?:bàn giao|dự kiến bàn giao|thời gian bàn giao)\s*[:\-–]\s*(.+)$/i]) || 'Quý IV / 2027';
  const bankSupport = extractField([/^(?:ngân hàng|hỗ trợ vay|tài chính)\s*[:\-–]\s*(.+)$/i]) ||
    'Ngân hàng đối tác hỗ trợ vay 70% giá trị sản phẩm, ân hạn gốc & lãi suất 0% trong 24 tháng.';
  const discountNote = extractField([/^(?:ưu đãi|chiết khấu|quà tặng)\s*[:\-–]\s*(.+)$/i]) ||
    'Chiết khấu thanh toán sớm hấp dẫn & quà tặng đặc quyền dành cho khách hàng giao dịch trong tháng.';
  const summary = extractField([/^(?:mô tả|giới thiệu|tổng quan)\s*[:\-–]\s*(.+)$/i]) ||
    `${name} tọa lạc tại ${address}, kiến tạo chuẩn mực sống sinh thái sang trọng với mật độ xây dựng chỉ ${density}, quy mô ${scale} và pháp lý ${legal.toLowerCase()}.`;

  // Ước lượng giá trị tỷ đồng phục vụ công cụ tính khoản vay
  let numericPriceBillion = tpl.numericPriceBillion;
  const tyMatch = priceRaw.match(/(\d+(?:[.,]\d+)?)\s*tỷ/i);
  if (tyMatch) {
    numericPriceBillion = parseFloat(tyMatch[1].replace(',', '.'));
  }

  // Bóc tách các dòng gạch đầu dòng làm Điểm nhấn & Kết nối vùng
  const bulletLines = lines
    .filter((l) => /^[-•✦✓*]/.test(l))
    .map((l) => l.replace(/^[-•✦✓*]+\s*/, '').trim())
    .filter(Boolean);

  const highlights = [];
  const connections = [];

  bulletLines.forEach((b) => {
    if (b.includes('|')) {
      const [time, place, detail] = b.split('|').map((x) => x.trim());
      if (time && place) {
        connections.push({ time, place, detail: detail || 'Kết nối thuận tiện' });
        return;
      }
    }
    const minuteMatch = b.match(/^(\d+\s*phút)\s*(?:đến|tới|->|–|-)\s*(.+)$/i);
    if (minuteMatch) {
      connections.push({
        time: minuteMatch[1],
        place: minuteMatch[2],
        detail: 'Hạ tầng giao thông đồng bộ'
      });
    } else {
      highlights.push(b);
    }
  });

  // Nhận diện tiện ích khớp từ khóa trong văn bản
  const lowerAll = rawText.toLowerCase();
  const matchedAmenities = AMENITY_LIBRARY.filter((a) => {
    const keywords = a.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return keywords.some((kw) => lowerAll.includes(kw));
  });

  const priceDisplay = priceRaw.replace(/\s*\(khoảng.*?\)/i, '').trim();

  return {
    id: `proj-${Date.now()}`,
    slug: slugifyVN(name) || `du-an-${Date.now()}`,
    name,
    category,
    status,
    featured: true,
    tagline,
    priceDisplay,
    numericPriceBillion,
    areaRange,
    locationShort,
    address,
    heroImage: tpl.heroImage,
    summary,
    highlights: highlights.length >= 2 ? highlights.slice(0, 6) : [...highlights, ...tpl.highlights].slice(0, 4),
    specs: [
      { label: 'Chủ đầu tư', value: developer },
      { label: 'Vị trí', value: address },
      { label: 'Quy mô dự án', value: scale },
      { label: 'Mật độ xây dựng', value: density },
      { label: 'Cơ cấu diện tích', value: areaRange },
      { label: 'Pháp lý', value: legal },
      { label: 'Dự kiến bàn giao', value: handover }
    ],
    location: {
      description: `Sở hữu vị trí chiến lược tại ${address}, ${name} thừa hưởng mạng lưới giao thông hoàn chỉnh cùng hệ sinh thái tiện ích thương mại, giáo dục, y tế hiện hữu xung quanh.`,
      mapQuery: address,
      mapEmbedUrl: '',
      connections: connections.length > 0 ? connections : [
        { time: '05 phút', place: 'Trung tâm thương mại & Trường quốc tế', detail: 'Chuỗi tiện ích hiện hữu liền kề' },
        { time: '10 phút', place: 'Bệnh viện quốc tế & Khu hành chính', detail: 'Trục đại lộ huyết mạch thông suốt' },
        { time: '15 phút', place: 'Trung tâm Thành phố', detail: 'Kết nối nhanh chóng và thuận tiện' }
      ]
    },
    amenities: (matchedAmenities.length >= 3 ? matchedAmenities.slice(0, 6) : tpl.amenities).map((a) => ({
      ...a,
      image: ''
    })),
    floorPlans: [
      {
        id: `fp-${Date.now()}`,
        title: 'Mặt Bằng Tổng Thể Quy Hoạch',
        area: scale,
        specs: areaRange,
        image: './assets/images/floorplan-master.svg'
      }
    ],
    policies: {
      bankSupport,
      discountNote,
      milestones: tpl.milestones.map((m) => ({ ...m }))
    },
    gallery: [
      { url: tpl.heroImage, caption: `Phối cảnh kiến trúc tổng thể ${name}` }
    ],
    videoUrl: ''
  };
}
