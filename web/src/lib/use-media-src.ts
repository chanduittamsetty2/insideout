"use client";

import { useEffect, useState } from "react";
import { getBlob } from "./media-db";

/** Resolves `idb:<id>` sources to object URLs; passes http(s) URLs through. */
export function useMediaSrc(src: string | undefined): string | undefined {
  const isLocal = !!src?.startsWith("idb:");
  const [local, setLocal] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    if (!src || !isLocal) return;
    let url: string | undefined;
    let cancelled = false;
    getBlob(src.slice(4)).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setLocal({ src, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, isLocal]);

  if (!isLocal) return src;
  return local && local.src === src ? local.url : undefined;
}
