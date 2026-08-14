"use client";

import { useEffect, useState } from "react";

import { FALLBACK_UPLOAD_LIMITS } from "@/lib/limits";
import type { UploadLimits } from "@/lib/types";

export interface ServerStatus {
  apiKeyConfigured: boolean;
  uploadLimits: UploadLimits;
}

/** Chỉ gọi /api/status một lần cho cả trang, dùng chung cho mọi thành phần. */
let statusPromise: Promise<ServerStatus> | null = null;

function fetchStatus(): Promise<ServerStatus> {
  if (!statusPromise) {
    statusPromise = fetch("/api/status")
      .then((res) => res.json())
      .then((data) => ({
        apiKeyConfigured: Boolean(data?.apiKeyConfigured),
        uploadLimits: (data?.uploadLimits as UploadLimits) ?? FALLBACK_UPLOAD_LIMITS,
      }))
      .catch(() => {
        // Không kiểm tra được trạng thái thì không chặn luồng: giả định chưa
        // có khóa trên máy chủ và dùng giới hạn tải lên thận trọng nhất.
        statusPromise = null;
        return {
          apiKeyConfigured: false,
          uploadLimits: FALLBACK_UPLOAD_LIMITS,
        };
      });
  }
  return statusPromise;
}

export function useServerStatus(): { status: ServerStatus | null } {
  const [status, setStatus] = useState<ServerStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}
