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

### Hai cách cung cấp khóa API

Ứng dụng chấp nhận khóa theo thứ tự ưu tiên sau:

1. **Khóa riêng của người dùng** — nhập trực tiếp ở ô "Khóa API Anthropic"
   trên giao diện. Khóa được lưu trong `localStorage` của trình duyệt và gửi
   kèm từng yêu cầu sinh câu hỏi qua header `x-anthropic-api-key`. Máy chủ
   dùng khóa đó để gọi Anthropic API rồi bỏ đi — **không lưu, không ghi log**.
   Phù hợp khi chia sẻ link công khai: mỗi người dùng trả chi phí phần của
   mình.
2. **Khóa của máy chủ** — biến môi trường `ANTHROPIC_API_KEY`. Dùng khi người
   dùng không nhập khóa riêng. Phù hợp khi ứng dụng chỉ phục vụ nội bộ, vì mọi
   lượt sinh câu hỏi đều tính vào tài khoản của người triển khai.

Nếu không có khóa nào, ứng dụng vẫn chạy và hiển thị hướng dẫn ngay trên giao
diện — các bước tải lên, xem trước, xem/sửa và xuất file vẫn dùng được, chỉ
riêng bước sinh câu hỏi cần khóa. Sau khi thêm biến môi trường phải **khởi
động lại server** để nạp giá trị mới (khóa nhập trên giao diện có hiệu lực
ngay, không cần khởi động lại).

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

## Triển khai lên Vercel

Dự án là ứng dụng Next.js chuẩn, không cần cấu hình riêng cho Vercel.

1. Đẩy mã nguồn lên GitHub (xem phần "Đưa mã lên GitHub" bên dưới).
2. Vào https://vercel.com/new → **Import Git Repository** → chọn repo này.
   Vercel tự nhận diện Next.js; giữ nguyên mọi thiết lập build mặc định.
3. **Environment Variables** (tùy chọn): thêm `ANTHROPIC_API_KEY` =
   `sk-ant-...` cho cả ba môi trường Production/Preview/Development nếu muốn
   máy chủ có khóa sẵn. Bỏ qua bước này nếu muốn mỗi người dùng tự nhập khóa
   của họ trên giao diện.
4. Bấm **Deploy**. Sau khi xong, mở URL `*.vercel.app` là dùng được ngay.

Đổi biến môi trường sau khi đã deploy thì phải **Redeploy** để giá trị mới có
hiệu lực.

### Những giới hạn của Vercel cần biết

- **Dung lượng tải lên**: Vercel chặn thân yêu cầu (request body) lớn hơn
  4.5 MB ở tầng hạ tầng, trước khi mã của ứng dụng chạy. Vì vậy khi phát hiện
  đang chạy trên Vercel (biến `VERCEL`), ứng dụng tự hạ giới hạn tải lên
  xuống **4 MB cho mỗi lần tải** (tổng các file) và báo lỗi rõ ràng ngay ở
  trình duyệt. Chạy tự quản (máy cá nhân, VPS, Docker) thì giới hạn là 20 MB
  mỗi file và 40 MB mỗi lần tải. Tài liệu lớn hơn: cắt bớt chương cần dùng,
  hoặc chuyển .pdf sang .docx/.txt (nhẹ hơn nhiều lần).
- **Thời gian chạy hàm**: `/api/generate` khai báo `maxDuration = 300` giây.
  Mức này cần **Fluid Compute** (đang bật mặc định cho project mới trên
  Vercel, gồm cả gói Hobby). Nếu deploy báo lỗi vượt giới hạn `maxDuration`,
  hãy bật Fluid Compute trong Settings → Functions, hoặc giảm giá trị này
  trong `src/app/api/generate/route.ts` xuống 60 và sinh ít câu mỗi lượt.
- **Khu vực máy chủ**: mặc định Vercel đặt hàm ở Washington D.C. (`iad1`).
  Người dùng ở Việt Nam có thể chọn Singapore (`sin1`) trong Settings →
  Functions → Function Region để giảm độ trễ.
- **Không có cơ sở dữ liệu**: mọi trạng thái nằm trong phiên trình duyệt. Tải
  lại trang là mất kết quả — hãy xuất file trước khi đóng tab.

## Đưa mã lên GitHub

```bash
git remote add origin https://github.com/<tài-khoản>/<tên-repo>.git
git push -u origin <tên-nhánh>
```

`.gitignore` đã loại trừ `.env*.local` và `node_modules`, nên khóa API thật
không bị đẩy lên. Trước khi push lần đầu, chạy `git status` để chắc chắn
không có file `.env.local` nào trong danh sách.

## Luồng sử dụng

1. **Tải lên**: kéo-thả một hoặc nhiều file .pdf/.docx/.txt/.md (tối đa 5
   file mỗi lần). Ứng dụng hiển thị danh sách file, tổng số trang, số từ và
   bản xem trước cấu trúc đề mục gộp từ mọi tài liệu.
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
    api/
      parse/          # Bóc tách file tải lên
      generate/        # Sinh câu hỏi (streaming NDJSON)
      regenerate/       # Sinh lại 1 câu hỏi
      export/           # Xuất .docx/.xlsx/.csv
    page.tsx           # Trang chính
  components/
    ui/                # Thành phần giao diện dùng chung (shadcn/ui)
    upload/              # Tải & xem trước tài liệu
    config/               # Form cấu hình sinh câu hỏi
    generate/               # Thanh tiến trình sinh câu hỏi
    review/                  # Bảng xem/sửa câu hỏi
    export/                   # Bảng chọn định dạng xuất file
    workflow/                  # Điều phối luồng 5 bước (app-shell)
  lib/
    types.ts            # Kiểu dữ liệu dùng chung
    limits.ts             # Giới hạn tải lên theo môi trường (Vercel/tự quản)
    client/                 # Tiện ích phía trình duyệt (khóa API, trạng thái)
    parsing/                  # Bóc tách PDF/DOCX/TXT/MD + gộp nhiều tài liệu
    generation/                 # Prompt, gọi Anthropic API, xác minh trích dẫn
    export/                       # Sinh file .docx/.xlsx/.csv
```

## Trạng thái triển khai

Dự án được triển khai tuần tự theo 5 bước:

1. ✅ Scaffold dự án + giao diện tải file
2. ✅ Bóc tách file + đánh số vị trí trang/đề mục
3. ✅ API sinh câu hỏi + xác minh trích dẫn
4. ✅ Bảng xem/sửa/sinh lại câu hỏi
5. ✅ Xuất file .docx/.xlsx/.csv
6. ✅ Tải lên nhiều tài liệu, khóa API do người dùng tự nhập, sẵn sàng deploy
   Vercel

### Bóc tách tài liệu (bước 2)

- `.pdf`: dùng `pdf-parse`, trích văn bản theo từng trang, phát hiện heading
  bằng heuristic (Chương/Phần/Bài/Mục, đánh số 1./1.1/I., dòng IN HOA), vị trí
  trích dẫn hiển thị dạng "Trang N". PDF không có lớp văn bản (bản scan) sẽ bị
  từ chối với thông báo yêu cầu OCR trước.
- `.docx`: dùng `mammoth` chuyển sang HTML rồi phân tích bằng `cheerio`, heading
  lấy trực tiếp từ style Heading 1–6, vị trí trích dẫn hiển thị dạng breadcrumb
  đề mục (ví dụ "Chương 1 › 1.2 Chẩn đoán").
- `.txt`/`.md`: `.md` nhận diện tiêu đề Markdown (`#`…`######`); `.txt` dùng
  cùng heuristic heading như PDF.
- Tài liệu được chia thành các đoạn (`chunk`) ~1800 ký tự, mỗi đoạn giữ nguyên
  vị trí trang/đề mục để phục vụ trích dẫn và xác minh ở bước sinh câu hỏi.

### Nhiều tài liệu cùng lúc

- Tải lên tối đa 5 file mỗi lần; có thể kéo-thả bổ sung từng file, hoặc xóa
  riêng một file (phần còn lại được bóc tách lại để nội dung luôn khớp danh
  sách hiện tại).
- Các file được bóc tách riêng rồi gộp thành **một nguồn nội dung duy nhất**:
  đoạn văn được đánh số liên tục, đề mục xếp theo từng file.
- Khi có từ 2 file trở lên, mọi vị trí trích dẫn được gắn tên file gốc
  (`giao-trinh.pdf · Trang 12`) để mỗi câu hỏi truy vết được về đúng tài liệu.
- Chọn phạm vi theo đề mục dùng khóa gồm cả tên file, nên hai tài liệu cùng có
  đề mục "Điều trị" không bị chọn nhầm sang nhau.

### Sinh câu hỏi + xác minh trích dẫn (bước 3)

- Gọi Anthropic API (`@anthropic-ai/sdk`, model `claude-sonnet-4-6`) theo lô
  tối đa 5 câu/lượt cho từng mức Bloom, giữ nguyên các câu đã sinh thành công
  giữa các lô.
- **Cửa sổ nội dung**: tài liệu lớn KHÔNG được nhồi toàn bộ vào mỗi prompt.
  Các chunk được gom thành cửa sổ ~12.000 ký tự; mỗi lô chỉ nhận một cửa sổ và
  luân phiên qua toàn tài liệu để câu hỏi trải đều. Nhờ đó tài liệu 124.000 từ
  giảm prompt từ ~643.000 xuống ~14.000 ký tự mỗi lần gọi (giảm ~46 lần), tránh
  vượt giới hạn token và chi phí tăng vọt. Việc xác minh trích dẫn vẫn đối
  chiếu với TOÀN BỘ tài liệu trong phạm vi đã chọn.
- Prompt yêu cầu model trả về JSON thuần (không markdown), liệt kê đầy đủ ràng
  buộc chất lượng (4 lựa chọn, cấm "tất cả đều đúng"/"không câu nào đúng", độ
  dài lựa chọn tương đương, vignette lâm sàng bắt buộc từ mức Vận dụng trở
  lên, giải thích cụ thể cho từng phương án sai).
- Parse JSON có try/catch, tự bóc tách nếu model lỡ kèm code fence.
- Xác minh trích dẫn tự động: mỗi `citation.quote` được so khớp với nguyên
  văn tài liệu sau khi chuẩn hóa khoảng trắng/dấu câu; câu không khớp bị loại
  và hệ thống tự sinh lại phần thiếu, tối đa 2 lần. Nếu vẫn thiếu, trả về ít
  câu hơn kèm cảnh báo rõ ràng — không bù bằng câu tự bịa.
- Lỗi mạng/API (timeout, 429, 5xx) tự động retry với exponential backoff, tối
  đa 3 lần.
- Tiến trình sinh câu hỏi hiển thị theo từng mức Bloom qua API dạng streaming
  NDJSON (`/api/generate`).

### Xem & sửa câu hỏi (bước 4)

- Bảng kết quả với bộ lọc theo mức Bloom.
- Sửa trực tiếp mọi trường của câu hỏi (nội dung, 4 lựa chọn, đáp án đúng,
  giải thích đúng/sai, trích dẫn, mục tiêu học tập) qua hộp thoại chỉnh sửa.
- Xóa từng câu (có xác nhận trước khi xóa).
- Sinh lại riêng từng câu qua API `/api/regenerate` — giữ nguyên vị trí
  trong bảng, tránh trùng lặp với các câu còn lại trong phiên làm việc.

### Xuất file (bước 5)

- API route `/api/export` sinh file theo yêu cầu (`docx-teacher`,
  `docx-student`, `xlsx`, `csv`) và trả về dưới dạng file tải xuống
  (`Content-Disposition: attachment`).
- **Bản giảng viên (.docx)**: câu hỏi nhóm theo mức Bloom, đánh dấu đáp án
  đúng, kèm giải thích đáp án đúng/sai và trích dẫn nguồn cho từng câu.
- **Bản sinh viên (.docx)**: chỉ gồm nội dung câu hỏi và 4 lựa chọn — không
  lộ đáp án hay giải thích.
- **.xlsx / .csv**: toàn bộ dữ liệu câu hỏi dạng bảng (đủ các trường: câu
  hỏi, 4 lựa chọn, đáp án đúng, giải thích đúng/sai từng phương án, trích
  dẫn, vị trí, mục tiêu học tập). File CSV có UTF-8 BOM để mở đúng tiếng
  Việt trên Excel.
