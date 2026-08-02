"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import type { BloomLevel, DocChunk, MCQQuestion } from "@/lib/types";
import { BLOOM_LEVELS } from "@/lib/types";
import type { GenerationRequestPayload } from "@/components/config/generation-config-form";

interface LevelState {
  requested: number;
  generated: number;
  done: boolean;
  warning?: string;
}

type LevelStates = Partial<Record<BloomLevel, LevelState>>;

interface GenerationProgressProps {
  chunks: DocChunk[];
  payload: GenerationRequestPayload;
  onComplete: (questions: MCQQuestion[]) => void;
  onError: (message: string) => void;
}

export function GenerationProgress({
  chunks,
  payload,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [levelStates, setLevelStates] = useState<LevelStates>({});
  const [isFinished, setIsFinished] = useState(false);
  const startedRef = useRef(false);
  const questionsRef = useRef<MCQQuestion[]>([]);
  const erroredRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunks, ...payload }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Không thể kết nối tới máy chủ sinh câu hỏi.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            handleEvent(event);
          }
        }

        if (buffer.trim()) {
          handleEvent(JSON.parse(buffer));
        }

        // Lỗi mà không sinh được câu nào: không báo hoàn tất (tránh hiển thị
        // "đã sinh xong 0 câu hỏi" như thể thành công). Nếu lỗi giữa chừng
        // nhưng đã có câu hợp lệ thì vẫn giữ lại các câu đó cho người dùng.
        if (erroredRef.current && questionsRef.current.length === 0) return;

        setIsFinished(true);
        onComplete(questionsRef.current);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Có lỗi không xác định.";
        onError(message);
      }
    }

    function handleEvent(event: {
      type: string;
      bloomLevel?: BloomLevel;
      generated?: number;
      requested?: number;
      questions?: MCQQuestion[];
      message?: string;
    }) {
      if (event.type === "progress" && event.bloomLevel) {
        setLevelStates((prev) => ({
          ...prev,
          [event.bloomLevel as BloomLevel]: {
            requested: event.requested || 0,
            generated: event.generated || 0,
            done: false,
          },
        }));
      } else if (event.type === "level_done" && event.bloomLevel) {
        if (event.questions) {
          questionsRef.current = [...questionsRef.current, ...event.questions];
        }
        setLevelStates((prev) => ({
          ...prev,
          [event.bloomLevel as BloomLevel]: {
            requested: prev[event.bloomLevel as BloomLevel]?.requested || 0,
            generated: event.questions?.length ?? 0,
            done: true,
          },
        }));
      } else if (event.type === "warning" && event.bloomLevel) {
        setLevelStates((prev) => ({
          ...prev,
          [event.bloomLevel as BloomLevel]: {
            ...(prev[event.bloomLevel as BloomLevel] as LevelState),
            warning: event.message,
          },
        }));
        toast.warning(event.message);
      } else if (event.type === "error") {
        erroredRef.current = true;
        toast.error(event.message || "Có lỗi khi sinh câu hỏi.");
        onError(event.message || "Có lỗi khi sinh câu hỏi.");
      }
    }

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLevels = BLOOM_LEVELS.filter((level) => payload.counts[level] > 0);

  return (
    <div className="space-y-4">
      {activeLevels.map((level) => {
        const state = levelStates[level];
        const requested = payload.counts[level];
        const generated = state?.generated ?? 0;
        const percent = requested > 0 ? Math.min(100, (generated / requested) * 100) : 0;
        return (
          <div key={level} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                {state?.done ? (
                  state.warning ? (
                    <AlertTriangle className="size-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="size-4 text-success" />
                  )
                ) : (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                {level}
              </span>
              <span className="text-muted-foreground">
                {generated}/{requested} câu
              </span>
            </div>
            <Progress value={percent} />
            {state?.warning && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {state.warning}
              </p>
            )}
          </div>
        );
      })}
      {isFinished && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" />
          Hoàn tất sinh câu hỏi.
        </p>
      )}
    </div>
  );
}
