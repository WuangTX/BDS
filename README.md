# 🏛️ Hưng Lộc Phát Luxury Style — Website Giới Thiệu BĐS & BDS Studio App (No-Push Publisher)

Hệ thống gồm **2 thành phần đồng bộ** được thiết kế tối ưu riêng cho lưu trữ & triển khai tự động trên **GitHub + GitHub Pages**:

1. **Website Giới Thiệu Bất Động Sản Cao Cấp (`index.html`)**
   - Ngôn ngữ thiết kế **Soft Organic Luxury** (lấy cảm hứng từ tông Xanh Ngọc Lục Bảo & Vàng Champagne của Hưng Lộc Phát nhưng **bo góc mềm mại hơn, chuyển cảnh mượt mà và giàu tính tương tác hơn**).
   - Đầy đủ: Hero Slider điện ảnh + Bộ lọc dự án nhanh, Giới thiệu Chủ đầu tư & Con số bảo chứng, Danh mục Dự án lọc tức thì, Giá trị cốt lõi, Tin tức thị trường, Đối tác chiến lược, Nút nổi Chat Zalo / Hotline.
   - **Landing Page riêng cho từng Dự án (`#/du-an/<slug>`)**: Tổng quan, Bảng thông số, Bản đồ vị trí Google Maps tự động + Kết nối vùng theo phút, Tiện ích nội khu, Sơ đồ mặt bằng đa tab phóng to Lightbox, Tiến độ thanh toán + **Công cụ tính khoản vay trả góp ngân hàng trực tiếp**, Thư viện ảnh & Form nhận bảng giá.

2. **Ứng Dụng Quản Trị & Tối Ưu Tạo Dự Án — BDS Studio (`studio.html`)**
   - Hoạt động ngay trên trình duyệt hoặc cài đặt như **App độc lập (PWA)** trên máy tính Windows / điện thoại.
   - **⚡ Dán nhanh thông tin dự án (Smart Paste)**: Copy tin nhắn từ Zalo / Word / Brochure dán vào — tự động tách thành trang dự án hoàn chỉnh!
   - **🏗️ 4 Mẫu khung dự án khởi tạo nhanh & Nhân bản 1-Click**.
   - **📸 Kéo-thả hàng loạt ảnh tự động nén sang WebP** ngay trên trình duyệt (giảm 75–90% dung lượng, giúp GitHub nhẹ và web tải tức thì).
   - **🎨 Quản trị toàn diện Thương hiệu, Logo, Hotline, Zalo, Tin tức & 5 Bảng màu BĐS hạng sang**.
   - **🚀 Xuất bản 1-Click thẳng lên GitHub qua API**: Đẩy toàn bộ ảnh mới + dữ liệu `data/site-data.json` chỉ trong **1 Commit nguyên tử duy nhất**, tự kích hoạt GitHub Actions cập nhật Website — **hoàn toàn không cần mở code hay gõ lệnh `git push`!**

---

## 🚀 Cách Chạy Thử Ngay Trên Máy Tính

Nhấp đúp chuột vào file **`Chay-Thu-Tren-May.bat`** (hoặc chạy `python -m http.server 8080`):
- **Website BĐS**: `http://localhost:8080/index.html`
- **App Quản trị BDS Studio**: `http://localhost:8080/studio.html`

---

## 🌐 Cách Đưa Lên GitHub & Bật Xuất Bản Tự Động (Chỉ Cần Làm 1 Lần Đầu)

1. Tạo một Repository mới trên [GitHub](https://github.com/new) (ví dụ: `bds-luxury`, để chế độ **Public** để dùng GitHub Pages miễn phí).
2. Nhấp đúp vào file **`Day-Len-GitHub-Lan-Dau.bat`** và dán đường dẫn repo vào (hoặc chạy `git remote add origin <URL>` rồi `git push -u origin main`).
3. Trên trang GitHub của Repo, vào **Settings → Pages → Build and deployment → Source**, chọn **`GitHub Actions`**.
4. Sau khoảng 20–30 giây, Website của bạn sẽ hoạt động tại:
   - Website chính thức: `https://<username>.github.io/<ten-repo>/`
   - App BDS Studio: `https://<username>.github.io/<ten-repo>/studio.html`
5. Mở **BDS Studio (`studio.html`)**:
   - **Lần đầu tiên đăng nhập:** Nhập `GitHub Username`, `Tên Repo`, `Fine-grained Personal Access Token` (quyền `Contents: Read and write`) và **Đặt mật khẩu mở khóa nhanh**. Hệ thống kiểm tra quyền chủ sở hữu trên GitHub và mã hóa Token bằng **AES-256-GCM** ngay trên trình duyệt.
   - **Từ các lần sau:** Chỉ cần nhập **Mật khẩu mở khóa ngắn** của bạn là vào thẳng BDS Studio và bấm nút **"🚀 Xuất bản lên Website"** (người lạ dù biết đường dẫn `studio.html` cũng bị chặn ngay tại cổng đăng nhập)!
