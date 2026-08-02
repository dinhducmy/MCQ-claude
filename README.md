# Sinh câu hỏi trắc nghiệm y khoa theo thang Bloom

Ứng dụng web giúp giảng viên y khoa tải lên tài liệu (bài giảng, giáo trình,
guideline…) và tự động sinh bộ câu hỏi trắc nghiệm (MCQ) phân loại theo 6 mức
thang Bloom (Nhớ, Hiểu, Vận dụng, Phân tích, Đánh giá, Sáng tạo), có trích dẫn
nguồn và cơ chế xác minh trích dẫn tự động để hạn chế bịa đặt nội dung.

## Công nghệ sử dụng

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Anthropic API (`@anthropic-ai/sdk`) — model `claude-sonnet-4-6`
- Bóc tách file: `pdf-parse` (.pdf), `mammoth` (.docx), đọc trực tiếp (.txt/.md)
- Xuất file: `docx` (.docx), `xlsx`/SheetJS (.xlsx, .csv)
- Không dùng cơ sở dữ liệu — toàn bộ trạng thái lưu trong phiên làm việc phía
  trình duyệt (React state)

## Yêu cầu hệ thống

- Node.js ≥ 18.18
- Khóa API Anthropic (tạo tại https://console.anthropic.com)

## Cài đặt

```bash
npm install
```

Tạo file `.env.local` từ mẫu `.env.example` và điền khóa API:

```bash
cp .env.example .env.local
```

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Lưu ý:** Tuyệt đối không commit `.env.local` hoặc khóa API thật vào git.

## Chạy ứng dụng

Chế độ phát triển:

```bash
npm run dev
```

Mở http://localhost:3000

Build production:

```bash
npm run build
npm run start
```

## Luồng sử dụng

1. **Tải lên**: kéo-thả 1 file .pdf/.docx/.txt/.md (tối đa 20 MB). Ứng dụng
   hiển thị tên file, số trang, số từ và bản xem trước cấu trúc đề mục.
2. **Cấu hình**: nhập số lượng câu hỏi cho từng mức Bloom (tổng tối đa 60
   câu), chọn đối tượng học và phạm vi nội dung.
3. **Sinh câu hỏi**: hệ thống chia tài liệu thành các đoạn có đánh số
   trang/đề mục, gửi theo lô tới model, hiển thị tiến trình theo từng mức
   Bloom, và tự động xác minh trích dẫn trước khi chấp nhận câu hỏi.
4. **Xem & sửa**: xem bảng kết quả, lọc theo mức Bloom, sửa trực tiếp, xóa
   hoặc sinh lại riêng từng câu.
5. **Xuất file**: tải về bản .docx dành cho giảng viên (có đáp án + giải
   thích), bản .docx dành cho sinh viên (chỉ câu hỏi + lựa chọn), .xlsx và
   .csv.

## Cấu trúc thư mục chính

```
src/
  app/
    api/            # API routes (parse, generate, export)
    page.tsx         # Trang chính
  components/
    ui/              # Thành phần giao diện dùng chung (shadcn/ui)
    upload/           # Thành phần tải & xem trước tài liệu
    workflow/          # Điều phối luồng 5 bước
  lib/
    types.ts          # Kiểu dữ liệu dùng chung (câu hỏi, tài liệu, cấu hình)
```

## Trạng thái triển khai

Dự án được triển khai tuần tự theo 5 bước:

1. ✅ Scaffold dự án + giao diện tải file
2. ⏳ Bóc tách file + đánh số vị trí trang/đề mục
3. ⏳ API sinh câu hỏi + xác minh trích dẫn
4. ⏳ Bảng xem/sửa/sinh lại câu hỏi
5. ⏳ Xuất file .docx/.xlsx/.csv
