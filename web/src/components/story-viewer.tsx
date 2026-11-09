"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Camera, X } from "lucide-react";
import { exactStamp, filmStamp } from "@/lib/freshness";
import { sectionInfo } from "@/lib/sections";
import { cn } from "@/lib/format";
import type { Media as MediaT, Restaurant } from "@/lib/types";
import { FreshChip, Media } from "./ui";

const PHOTO_MS = 5000;

export function StoryViewer({
  restaurant,
  items,
  start = 0,
  now,
  onClose,
}: {
  restaurant: Restaurant;
  items: MediaT[];
  start?: number;
  now: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [paused, setPaused] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const item = items[index];

  const next = useCallback(() => {
    setVideoProgress(0);
    setIndex((i) => {
      if (i + 1 >= items.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [items.length, onClose]);

  const prev = useCallback(() => {
    setVideoProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [next, prev, onClose]);

  if (!item) return null;
  const info = sectionInfo(item.section);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-black sm:h-[92dvh] sm:rounded-[32px]">
        <Media
          key={item.id}
          src={item.src}
          kind={item.kind}
          className="absolute inset-0 size-full animate-pop"
          autoPlay
          onEnded={next}
        />
        {item.kind === "video" && <VideoProgressTracker id={item.id} onProgress={setVideoProgress} />}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />

        <div className="absolute inset-x-0 top-0 z-10 p-3">
          <div className="flex gap-1">
            {items.map((m, i) => (
              <div key={m.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < index && <div className="h-full w-full bg-white" />}
                {i === index &&
                  (m.kind === "video" ? (
                    <div className="h-full bg-white" style={{ width: `${videoProgress * 100}%` }} />
                  ) : (
                    <div
                      key={`${m.id}-${index}`}
                      className="h-full bg-white"
                      style={{
                        animation: `story-fill ${PHOTO_MS}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={next}
                    />
                  ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-white">
            <div className="grid size-10 place-items-center rounded-full bg-white/15 text-xl backdrop-blur">{info.emoji}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-bold leading-tight">{info.label}</p>
              <p className="truncate text-xs text-white/70">{restaurant.name}</p>
            </div>
            <FreshChip ts={item.capturedAt} now={now} className="bg-white/90" />
            <button
              onClick={onClose}
              className="pointer-events-auto grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="absolute inset-0 z-[5] flex">
          <button
            aria-label="Previous"
            className="h-full w-1/3"
            onClick={prev}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          />
          <button
            aria-label="Next"
            className="h-full w-2/3"
            onClick={next}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          />
        </div>

        <div className="pointer-events-none absolute right-5 bottom-36 z-10 film-stamp text-lg">{filmStamp(item.capturedAt)}</div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5 text-white">
          {item.caption && <p className="mb-3 text-[15px] leading-snug font-medium">{item.caption}</p>}
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-xs backdrop-blur-md">
            <Camera className="size-4 shrink-0 text-lime" />
            <span className="min-w-0 flex-1">
              Captured live in-app · <span className="font-semibold">{exactStamp(item.capturedAt)}</span>
            </span>
            <BadgeCheck className={cn("size-4 shrink-0 text-lime")} />
          </div>
          <p className="mt-2 text-center text-[11px] text-white/50">Time stamped by InsideOut. Restaurants can&apos;t edit dates.</p>
        </div>
      </div>
      <style>{`@keyframes story-fill { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}

function VideoProgressTracker({ id, onProgress }: { id: string; onProgress: (p: number) => void }) {
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = document.querySelector("video");
      if (v && v.duration) onProgress(v.currentTime / v.duration);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, onProgress]);
  return null;
}
