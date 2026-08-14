"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIENCE_OPTIONS,
  BLOOM_LEVELS,
  BLOOM_LEVEL_INFO,
  EMPTY_BLOOM_COUNTS,
  MAX_TOTAL_QUESTIONS,
  SCOPE_MODES,
  type AudienceValue,
  type BloomCounts,
  type OutlineItem,
  type ScopeMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { scopeKeyOf } from "@/lib/generation/filter-chunks";

export interface GenerationRequestPayload {
  counts: BloomCounts;
  audience: AudienceValue;
  scopeMode: ScopeMode;
  /** Khóa đề mục đã chọn (kèm tên file nguồn), xem `scopeKeyOf`. */
  selectedScopeKeys: string[];
}

interface GenerationConfigFormProps {
  outline: OutlineItem[];
  /** Có nhiều hơn 1 tài liệu → hiển thị đề mục theo từng file. */
  multiSource: boolean;
  onSubmit: (payload: GenerationRequestPayload) => void;
  disabled?: boolean;
}

export function GenerationConfigForm({
  outline,
  multiSource,
  onSubmit,
  disabled,
}: GenerationConfigFormProps) {
  const [counts, setCounts] = useState<BloomCounts>({ ...EMPTY_BLOOM_COUNTS });
  const [audience, setAudience] = useState<AudienceValue>(
    AUDIENCE_OPTIONS[0].value,
  );
  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const total = useMemo(
    () => BLOOM_LEVELS.reduce((sum, level) => sum + (counts[level] || 0), 0),
    [counts],
  );

  const isOverLimit = total > MAX_TOTAL_QUESTIONS;
  const canSubmit =
    !disabled &&
    total > 0 &&
    !isOverLimit &&
    (scopeMode === "all" || selectedKeys.size > 0);

  /**
   * Mức Bloom tiếng Việt có dấu cách ("Vận dụng") — id/htmlFor của HTML không
   * được chứa khoảng trắng, nên dùng thứ tự mức làm định danh.
   */
  function bloomInputId(level: (typeof BLOOM_LEVELS)[number]): string {
    return `bloom-${BLOOM_LEVELS.indexOf(level)}`;
  }

  function updateCount(level: (typeof BLOOM_LEVELS)[number], value: string) {
    const n = Math.max(0, Number.parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [level]: n }));
  }

  function toggleScopeKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      counts,
      audience,
      scopeMode,
      selectedScopeKeys: Array.from(selectedKeys),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium">Số lượng câu hỏi theo mức Bloom</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BLOOM_LEVELS.map((level) => (
            <div key={level} className="space-y-1.5 rounded-lg border p-3">
              <Label
                htmlFor={bloomInputId(level)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="font-medium">
                  {level} <span className="text-muted-foreground">({BLOOM_LEVEL_INFO[level].en})</span>
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {BLOOM_LEVEL_INFO[level].description}
                </span>
              </Label>
              <Input
                id={bloomInputId(level)}
                type="number"
                min={0}
                max={MAX_TOTAL_QUESTIONS}
                value={counts[level]}
                onChange={(e) => updateCount(level, e.target.value)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
        <p
          className={cn(
            "mt-2 text-sm",
            isOverLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          Tổng: {total} / {MAX_TOTAL_QUESTIONS} câu
          {isOverLimit && " — vượt quá giới hạn tối đa"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="audience">Đối tượng học</Label>
          <Select
            value={audience}
            onValueChange={(v) => setAudience(v as AudienceValue)}
            disabled={disabled}
          >
            <SelectTrigger id="audience" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scope">Phạm vi nội dung</Label>
          <Select
            value={scopeMode}
            onValueChange={(v) => setScopeMode(v as ScopeMode)}
            disabled={disabled}
          >
            <SelectTrigger id="scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_MODES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {scopeMode === "sections" && (
        <div>
          <p className="mb-2 text-sm font-medium">Chọn đề mục</p>
          {outline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tài liệu không có cấu trúc đề mục rõ ràng để chọn.
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
              {outline.map((item, index) => {
                const key = scopeKeyOf(item.sourceFile, item.title);
                const showFileHeader =
                  multiSource &&
                  item.sourceFile !== outline[index - 1]?.sourceFile;
                return (
                  <Fragment key={item.id}>
                    {showFileHeader && (
                      <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                        {item.sourceFile}
                      </p>
                    )}
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                      style={{ paddingLeft: `${0.5 + (item.level - 1) * 1}rem` }}
                    >
                      <Checkbox
                        checked={selectedKeys.has(key)}
                        onCheckedChange={() => toggleScopeKey(key)}
                        disabled={disabled}
                      />
                      <span className="truncate">{item.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {item.location}
                      </span>
                    </label>
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full sm:w-auto">
        Sinh câu hỏi
      </Button>
    </div>
  );
}
