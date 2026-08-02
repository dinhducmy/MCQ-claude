import {
  AUDIENCE_OPTIONS,
  BLOOM_LEVEL_INFO,
  type AudienceValue,
  type BloomLevel,
  type DocChunk,
} from "@/lib/types";

function audienceLabel(value: AudienceValue): string {
  return (
    AUDIENCE_OPTIONS.find((o) => o.value === value)?.label ?? "Sinh viên Y"
  );
}

function formatChunks(chunks: DocChunk[]): string {
  return chunks
    .map(
      (c) =>
        `--- [Đoạn ${c.index}] (Vị trí: ${c.location}) ---\n${c.text}`,
    )
    .join("\n\n");
}

const SCHEMA_DESCRIPTION = `{
  "questions": [
    {
      "bloom_level": "<đúng bằng mức Bloom được yêu cầu>",
      "stem": "<nội dung câu hỏi, có vignette lâm sàng nếu từ mức Vận dụng trở lên>",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation_correct": "<giải thích vì sao đáp án đúng đúng>",
      "citation": {
        "quote": "<trích nguyên văn TỪ TÀI LIỆU, tối đa 25 từ, không diễn giải>",
        "location": "<vị trí đoạn trích, ví dụ 'Trang 3' hoặc đề mục>"
      },
      "explanations_incorrect": {
        "<mã 3 phương án còn lại>": "<vì sao phương án đó sai, nêu lý do cụ thể>"
      },
      "learning_objective": "<mục tiêu học tập câu hỏi này đánh giá>"
    }
  ]
}`;

export function buildGenerationPrompt(opts: {
  bloomLevel: BloomLevel;
  count: number;
  audience: AudienceValue;
  chunks: DocChunk[];
  avoidStems?: string[];
}): { system: string; user: string } {
  const { bloomLevel, count, audience, chunks, avoidStems } = opts;
  const info = BLOOM_LEVEL_INFO[bloomLevel];

  const system = `Bạn là chuyên gia đo lường đánh giá trong giáo dục y khoa, biên soạn câu hỏi trắc nghiệm (MCQ) theo thang Bloom.

QUY TẮC BẮT BUỘC:
1. CHỈ được sử dụng nội dung có trong các đoạn tài liệu được cung cấp. TUYỆT ĐỐI không bổ sung kiến thức bên ngoài tài liệu, kể cả khi kiến thức đó đúng về mặt y khoa.
2. Mỗi câu hỏi có đúng 4 lựa chọn A-D, duy nhất 1 đáp án đúng. 3 phương án nhiễu phải hợp lý về mặt y khoa, sai vì một lý do cụ thể — không sai hiển nhiên.
3. CẤM dùng các cụm "tất cả đều đúng", "không câu nào đúng", "A và B đúng" hoặc tương đương.
4. Độ dài 4 lựa chọn phải tương đương nhau; đáp án đúng không được là lựa chọn dài nhất.
5. Thuật ngữ y khoa: viết tiếng Việt kèm tiếng Anh trong ngoặc ở lần xuất hiện đầu tiên.
6. Mỗi câu BẮT BUỘC có "citation.quote" là trích nguyên văn (không paraphrase) tối đa 25 từ lấy trực tiếp từ đoạn tài liệu, và "citation.location" ghi đúng vị trí đoạn đó (copy từ nhãn "Vị trí" của đoạn được trích).
7. Mỗi "explanations_incorrect" phải nêu rõ, cụ thể vì sao phương án đó sai — không viết chung chung như "không đúng" hay "sai".
8. Nếu tài liệu không đủ nội dung để sinh đủ số câu yêu cầu, chỉ sinh số câu có thể sinh được một cách trung thực — TUYỆT ĐỐI không bịa thêm.
9. Trả về DUY NHẤT một JSON object thuần theo đúng schema bên dưới. KHÔNG kèm markdown code fence, KHÔNG kèm lời dẫn, KHÔNG kèm giải thích ngoài JSON.

Mức Bloom cần sinh: "${bloomLevel}" (${info.en}) — ${info.description}.
${
  bloomLevel === "Vận dụng" ||
  bloomLevel === "Phân tích" ||
  bloomLevel === "Đánh giá" ||
  bloomLevel === "Sáng tạo"
    ? "BẮT BUỘC dùng vignette lâm sàng ngắn (bệnh cảnh + dữ kiện lâm sàng cụ thể) trong phần stem thay vì hỏi tái nhận kiến thức thuần túy."
    : ""
}

Schema JSON đầu ra:
${SCHEMA_DESCRIPTION}`;

  const avoidSection =
    avoidStems && avoidStems.length > 0
      ? `\n\nCác câu hỏi sau đã được sinh, KHÔNG lặp lại nội dung/ý tưởng tương tự:\n${avoidStems
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")}`
      : "";

  const user = `Đối tượng học: ${audienceLabel(audience)}.
Hãy sinh ĐÚNG ${count} câu hỏi trắc nghiệm mức Bloom "${bloomLevel}" từ các đoạn tài liệu sau (mỗi đoạn có đánh số vị trí):

${formatChunks(chunks)}${avoidSection}

Trả về JSON thuần theo đúng schema đã mô tả, đúng ${count} câu hỏi (hoặc ít hơn nếu tài liệu không đủ nội dung — không bịa thêm).`;

  return { system, user };
}
