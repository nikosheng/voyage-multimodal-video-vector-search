import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "countdown" | "recording" | "processing";

interface WebcamRecorderProps {
  countdownSeconds?: number;
  recordSeconds?: number;
  onRecorded: (blob: Blob) => void | Promise<void>;
  disabled?: boolean;
  buttonLabel?: string;
}

/**
 * Shared webcam capture component used by both the participant flow and the
 * admin sandbox test page. Records a fixed-length clip (default 4s) after a
 * short countdown, then hands the resulting Blob to the caller.
 */
export default function WebcamRecorder({
  countdownSeconds = 3,
  recordSeconds = 4,
  onRecorded,
  disabled = false,
  buttonLabel = "開始許願",
}: WebcamRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<RecorderState>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [recordProgress, setRecordProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => setError(`無法存取鏡頭: ${err.message}`));

    return () => {
      cancelled = true;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      setError("鏡頭仲未準備好，請稍後再試");
      return;
    }
    setError(null);
    setState("countdown");
    setCountdown(countdownSeconds);

    let count = countdownSeconds;
    const countdownTimer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownTimer);
        beginRecording(stream);
      }
    }, 1000);
  }, [countdownSeconds]);

  const beginRecording = (stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setState("processing");
      const blob = new Blob(chunksRef.current, { type: mimeType });
      try {
        await onRecorded(blob);
      } finally {
        setState("idle");
        setRecordProgress(0);
      }
    };

    recorder.start();
    setState("recording");

    let elapsedMs = 0;
    const tick = 100;
    const progressTimer = setInterval(() => {
      elapsedMs += tick;
      setRecordProgress(Math.min(1, elapsedMs / (recordSeconds * 1000)));
      if (elapsedMs >= recordSeconds * 1000) {
        clearInterval(progressTimer);
        recorder.stop();
      }
    }, tick);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border-4 border-emerald-500/40 bg-black shadow-xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        {state === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-8xl font-bold text-white drop-shadow-lg">{countdown}</span>
          </div>
        )}
        {state === "recording" && (
          <div className="absolute inset-x-0 bottom-0 h-2 bg-black/30">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${recordProgress * 100}%` }}
            />
          </div>
        )}
        {state === "recording" && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            錄影中
          </div>
        )}
        {state === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <span className="text-lg text-white">🎅 Santa 施法緊...</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={startRecording}
        disabled={disabled || state !== "idle"}
        className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "idle" ? buttonLabel : "請等等..."}
      </button>
    </div>
  );
}
