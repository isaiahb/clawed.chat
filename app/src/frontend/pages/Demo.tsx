/**
 * /demo — wear the glasses, in your browser.
 *
 * Turns the visitor's device into Clawed: their camera becomes the glasses
 * POV (rear camera on phones), their mic is the wake mic, and answers come
 * back as spoken audio + HUD text — exactly the Mentra Live / Even G2 split.
 *
 * Visual questions snap a real frame and run the REAL pipeline
 * (/api/vision → Nebius vision → Tavily). Anything else goes to /api/judge —
 * the live OpenClaw. Nothing is canned.
 *
 * API base resolution: ?api=<url> query param (persisted to localStorage)
 * → localStorage → https://clawed.chat/api. Lets the static Pages site
 * target a tunnel or VM before DNS cutover.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Mic, Eye, Glasses, ArrowLeft, Keyboard } from "lucide-react";
import { Button } from "../components/ui/button";

// ─── API base ────────────────────────────────────────────────────────────────

function resolveApiBase(): string {
  try {
    const param = new URLSearchParams(window.location.search).get("api");
    if (param) {
      localStorage.setItem("clawed-demo-api", param);
      return param.replace(/\/$/, "");
    }
    const stored = localStorage.getItem("clawed-demo-api");
    if (stored) return stored.replace(/\/$/, "");
  } catch {}
  return "https://api.clawed.chat/api";
}

// ─── Speech helpers (Chrome Web Speech API; degrade to typing) ──────────────

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
}

function makeRecognizer(): SpeechRecognitionLike | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec: SpeechRecognitionLike = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

function speak(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

/** Questions that need the camera (mirrors the miniapp's intent regex). */
const VISION_RE =
  /\b(?:what(?:'s| is| am i| are you)? (?:i )?(?:this|that|looking at|seeing)|look at this|what do you see|can you see|read this|identify)\b/i;

type Phase = "intro" | "starting" | "live" | "listening" | "thinking" | "denied";

interface HudLine {
  role: "you" | "clawed" | "system";
  text: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Demo() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState<HudLine[]>([]);
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [showType, setShowType] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const apiBase = useRef(resolveApiBase());
  const busyRef = useRef(false);

  useEffect(() => {
    document.title = "Clawed — try the glasses in your browser 🦞";
    setHasSpeech(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  const pushHud = useCallback((line: HudLine) => {
    setHud((prev) => [...prev.slice(-3), line]);
  }, []);

  // ─── Start the experience ──────────────────────────────────────────────────

  const putThemOn = async () => {
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("live");
      pushHud({ role: "system", text: "Connected. Hold the button and ask about what you see." });
      speak("Hey. I'm Clawed. Show me something.");
    } catch {
      setPhase("denied");
    }
  };

  // ─── Capture a frame as a data URL ─────────────────────────────────────────

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1024 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  // ─── Ask the agent ─────────────────────────────────────────────────────────

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busyRef.current) return;
      busyRef.current = true;
      pushHud({ role: "you", text: q });
      setPhase("thinking");

      try {
        let answer: string;
        if (VISION_RE.test(q)) {
          const frame = captureFrame();
          if (!frame) throw new Error("no frame");
          const res = await fetch(`${apiBase.current}/vision`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoUrl: frame, mimeType: "image/jpeg", question: q }),
          });
          if (!res.ok) throw new Error(`vision ${res.status}`);
          answer = ((await res.json()) as { answer: string }).answer;
        } else {
          const res = await fetch(`${apiBase.current}/judge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: q }),
          });
          if (!res.ok) throw new Error(`judge ${res.status}`);
          answer = ((await res.json()) as { reply: string }).reply;
        }
        pushHud({ role: "clawed", text: answer });
        speak(answer);
      } catch {
        const msg =
          "I can't reach my brain right now — the backend may be waking up. The glasses version talks straight to your own OpenClaw.";
        pushHud({ role: "system", text: msg });
        speak(msg);
      } finally {
        busyRef.current = false;
        setPhase("live");
      }
    },
    [pushHud],
  );

  // ─── Push-to-talk ──────────────────────────────────────────────────────────

  const startListening = () => {
    if (phase !== "live" || busyRef.current) return;
    const rec = makeRecognizer();
    if (!rec) {
      setShowType(true);
      return;
    }
    recRef.current = rec;
    setInterim("");
    setPhase("listening");
    let final = "";
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(final + interimText);
    };
    rec.onend = () => {
      setInterim("");
      if (final.trim()) void ask(final);
      else setPhase("live");
    };
    rec.onerror = () => {
      setInterim("");
      setPhase("live");
    };
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === "intro" || phase === "denied" || phase === "starting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-claw-red/10 border border-claw-red/20">
            <Glasses className="h-8 w-8 text-claw-red" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Try the glasses.
            <br />
            <span className="text-gradient-red">No glasses required.</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
            Your camera becomes the lens. Hold the button, ask{" "}
            <em>"what am I looking at?"</em> — a real frame goes through the real
            pipeline (Nebius vision + Tavily live search) and Clawed answers out
            loud. Ask anything else and you're talking to a live OpenClaw.
          </p>
          {phase === "denied" && (
            <p className="mt-4 text-claw-red text-[13px]">
              Camera permission was blocked — allow it (or try another browser) and
              press the button again.
            </p>
          )}
          <Button
            size="lg"
            onClick={putThemOn}
            disabled={phase === "starting"}
            className="mt-8 gap-2 px-8 h-12 bg-claw-red hover:bg-claw-red-bright text-white font-bold"
          >
            <Camera className="h-4 w-4" />
            {phase === "starting" ? "Opening the lens…" : "Put them on"}
          </Button>
          <p className="mt-6 text-[12px] text-muted-foreground/60">
            Frames are sent only when you ask a visual question. Nothing is stored.{" "}
            <Link to="/" className="underline underline-offset-2">
              Back to clawed.chat
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* POV camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* HUD frame — glasses lens corners */}
      <div className="pointer-events-none absolute inset-4 sm:inset-8">
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map(
          (cls) => (
            <div key={cls} className={`absolute h-8 w-8 ${cls} border-claw-red/70 rounded-sm`} />
          ),
        )}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.25em] text-claw-red/90">
          <Eye className="h-3.5 w-3.5" />
          Clawed · live
        </div>
      </div>

      {/* HUD transcript */}
      <div className="absolute inset-x-0 bottom-32 px-6 sm:px-16 space-y-2 pointer-events-none">
        {hud.map((line, i) => (
          <p
            key={i}
            className={`font-mono text-[13px] sm:text-[15px] leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
              line.role === "clawed"
                ? "text-claw-red-bright font-semibold"
                : line.role === "you"
                  ? "text-white/90"
                  : "text-white/50 italic"
            }`}
          >
            {line.role === "clawed" ? "🦞 " : line.role === "you" ? "▸ " : ""}
            {line.text}
          </p>
        ))}
        {interim && (
          <p className="font-mono text-[13px] sm:text-[15px] text-white/70 italic">▸ {interim}▍</p>
        )}
        {phase === "thinking" && (
          <p className="font-mono text-[15px] text-claw-red-bright animate-pulse">🦞 …</p>
        )}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
        {showType ? (
          <form
            className="flex w-full max-w-md gap-2 px-6"
            onSubmit={(e) => {
              e.preventDefault();
              const q = typed;
              setTyped("");
              void ask(q);
            }}
          >
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder='Try: "what am I looking at?"'
              className="flex-1 rounded-full bg-black/60 border border-white/20 px-5 py-3 text-white text-[14px] outline-none focus:border-claw-red backdrop-blur"
            />
            <button
              type="submit"
              className="rounded-full bg-claw-red px-5 text-white font-bold"
            >
              Ask
            </button>
          </form>
        ) : (
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={(e) => {
              e.preventDefault();
              startListening();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopListening();
            }}
            disabled={phase === "thinking"}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all select-none ${
              phase === "listening"
                ? "bg-claw-red border-claw-red-bright scale-110 shadow-[0_0_40px_rgba(230,62,46,0.6)]"
                : "bg-black/50 border-claw-red/70 backdrop-blur hover:scale-105"
            } ${phase === "thinking" ? "opacity-40" : ""}`}
          >
            <Mic className="h-8 w-8 text-white" />
          </button>
        )}
        <div className="flex items-center gap-4 text-[11px] font-mono text-white/60">
          <span>{showType ? "type your question" : hasSpeech ? "hold to talk" : "voice unsupported — type instead"}</span>
          <button
            onClick={() => setShowType((v) => !v)}
            className="pointer-events-auto flex items-center gap-1 underline underline-offset-2"
          >
            {showType ? <Mic className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
            {showType ? "use voice" : "use keyboard"}
          </button>
          <Link to="/" className="flex items-center gap-1 underline underline-offset-2 pointer-events-auto">
            <ArrowLeft className="h-3 w-3" />
            exit
          </Link>
        </div>
      </div>
    </div>
  );
}
