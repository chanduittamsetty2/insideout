"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { sectionInfo } from "@/lib/sections";
import { cn } from "@/lib/format";
import type { MediaKind, SectionKey } from "@/lib/types";

const MAX_VIDEO_S = 15;

type Phase = "starting" | "live" | "recording" | "review" | "fallback";

interface Result {
  blob: Blob;
  kind: MediaKind;
  url: string;
}

export function CameraCapture({
  section,
  onClose,
  onCaptured,
}: {
  section: SectionKey;
  onClose: () => void;
  onCaptured: (blob: Blob, kind: MediaKind, caption?: string) => Promise<void> | void;
}) {
  const info = sectionInfo(section);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [mode, setMode] = useState<MediaKind>("photo");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setPhase("fallback"));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setPhase("live");
      })
      .catch(() => !cancelled && setPhase("fallback"));
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_VIDEO_S) recorderRef.current?.stop();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  function takePhoto() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => blob && finish(blob, "photo"),
      "image/jpeg",
      0.82,
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => finish(new Blob(chunks, { type: rec.mimeType || "video/webm" }), "video");
    recorderRef.current = rec;
    rec.start();
    setSeconds(0);
    setPhase("recording");
  }

  function finish(blob: Blob, kind: MediaKind) {
    setResult({ blob, kind, url: URL.createObjectURL(blob) });
    setPhase("review");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) finish(file, file.type.startsWith("video") ? "video" : "photo");
  }

  function retake() {
    setResult(null);
    setCaption("");
    setPhase(streamRef.current ? "live" : "fallback");
  }

  async function post() {
    if (!result) return;
    setSaving(true);
    await onCaptured(result.blob, result.kind, caption.trim() || undefined);
    setSaving(false);
    onClose();
  }

  const shutter = () => {
    if (mode === "photo") return takePhoto();
    if (phase === "recording") return recorderRef.current?.stop();
    startRecording();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black text-white">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-black sm:h-[92dvh] sm:rounded-[32px]">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent p-4">
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="Close">
            <X className="size-5" />
          </button>
          <div className="flex-1">
            <p className="font-display text-lg font-bold leading-tight">
              {info.emoji} {info.label}
            </p>
            <p className="text-xs text-white/70">{info.hint}</p>
          </div>
          {phase === "recording" && (
            <span className="flex items-center gap-1.5 rounded-full bg-stale px-3 py-1 text-xs font-bold">
              <span className="size-2 animate-pulse rounded-full bg-white" /> {seconds}s / {MAX_VIDEO_S}s
            </span>
          )}
        </div>

        <div className="relative flex-1">
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn("absolute inset-0 size-full object-cover", (phase === "review" || phase === "fallback") && "hidden")}
          />

          {phase === "starting" && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-white/60" />
            </div>
          )}

          {phase === "review" && result &&
            (result.kind === "video" ? (
              <video src={result.url} className="absolute inset-0 size-full object-cover" autoPlay loop muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.url} alt="" className="absolute inset-0 size-full object-cover" />
            ))}

          {phase === "fallback" && (
            <div className="absolute inset-0 grid place-items-center p-8 text-center">
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-white/10">
                  <Camera className="size-7" />
                </div>
                <p className="mt-4 font-display text-xl font-bold">Open your camera</p>
                <p className="mt-1 text-sm text-white/60">
                  Live camera preview needs HTTPS and camera permission. On your phone, this opens the camera directly.
                </p>
                <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-lime px-6 py-3 font-bold text-ink">
                  <Camera className="size-5" /> Take photo / video
                  <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={onFile} />
                </label>
              </div>
            </div>
          )}

          {(phase === "live" || phase === "recording" || phase === "review") && (
            <div className="pointer-events-none absolute right-4 bottom-4 film-stamp text-base">
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, " ")}{" "}
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </div>
          )}
        </div>

        {phase === "review" ? (
          <div className="space-y-3 bg-black p-4 pb-6">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
              placeholder="Add a caption (optional)"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-[15px] outline-none placeholder:text-white/40 focus:bg-white/15"
            />
            <div className="flex items-center gap-2 rounded-2xl bg-lime/10 px-3 py-2.5 text-xs text-lime">
              <ShieldCheck className="size-4 shrink-0" /> InsideOut stamps the exact upload time. It can&apos;t be edited later.
            </div>
            <div className="flex gap-2">
              <button onClick={retake} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-3.5 font-bold">
                <RotateCcw className="size-4" /> Retake
              </button>
              <button
                onClick={post}
                disabled={saving}
                className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-lime py-3.5 font-bold text-ink disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} Post it live
              </button>
            </div>
          </div>
        ) : phase === "live" || phase === "recording" ? (
          <div className="bg-black px-6 pt-4 pb-8">
            <div className="mb-5 flex justify-center gap-6 text-xs font-bold tracking-widest">
              {(["photo", "video"] as const).map((m) => (
                <button
                  key={m}
                  disabled={phase === "recording"}
                  onClick={() => setMode(m)}
                  className={cn("uppercase transition", mode === m ? "text-lime" : "text-white/50")}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={shutter}
                aria-label={mode === "photo" ? "Take photo" : phase === "recording" ? "Stop recording" : "Start recording"}
                className="grid size-[76px] place-items-center rounded-full border-4 border-white transition active:scale-95"
              >
                <span
                  className={cn(
                    "block transition-all",
                    mode === "photo" && "size-[60px] rounded-full bg-white",
                    mode === "video" && phase !== "recording" && "size-[60px] rounded-full bg-stale",
                    phase === "recording" && "size-7 rounded-md bg-stale",
                  )}
                />
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] text-white/50">
              {mode === "video" ? `Up to ${MAX_VIDEO_S} seconds` : "Live capture only. No gallery uploads."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
