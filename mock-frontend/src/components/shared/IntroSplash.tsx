import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// SVG Fish Component
// ──────────────────────────────────────────────

interface FishProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
  delay?: number;
  direction?: "left" | "right";
  eaten?: boolean;
  swimOffset?: { x: number; y: number };
}

function Fish({
  x,
  y,
  size = 24,
  color = "#66aacc",
  delay: _delay = 0,
  direction = "left",
  eaten = false,
  swimOffset = { x: 0, y: 0 },
}: FishProps) {
  const scaleX = direction === "left" ? 1 : -1;
  const finalX = x + swimOffset.x;
  const finalY = y + swimOffset.y;

  return (
    <g
      style={{
        transform: `translate(${finalX}px, ${finalY}px) scale(${eaten ? 0 : scaleX}, ${eaten ? 0 : 1})`,
        transition: eaten
          ? "transform 0.25s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease"
          : "transform 1.8s cubic-bezier(0.37, 0, 0.63, 1)",
        opacity: eaten ? 0 : 1,
        transformOrigin: `${finalX}px ${finalY}px`,
      }}
    >
      {/* Body */}
      <ellipse
        cx={0}
        cy={0}
        rx={size * 0.5}
        ry={size * 0.28}
        fill={color}
        opacity={0.9}
      />
      {/* Tail */}
      <polygon
        points={`${-size * 0.5},0 ${-size * 0.8},${-size * 0.25} ${-size * 0.8},${size * 0.25}`}
        fill={color}
        opacity={0.8}
      />
      {/* Eye */}
      <circle cx={size * 0.2} cy={-size * 0.06} r={size * 0.06} fill="#111" />
      <circle cx={size * 0.22} cy={-size * 0.08} r={size * 0.025} fill="#fff" />
      {/* Fin */}
      <path
        d={`M${-size * 0.05},${size * 0.1} Q${0},${size * 0.35} ${size * 0.15},${size * 0.15}`}
        fill={color}
        opacity={0.6}
      />
    </g>
  );
}

// ──────────────────────────────────────────────
// SVG Bubble
// ──────────────────────────────────────────────

function Bubble({
  x,
  y,
  size,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill="none"
      stroke="rgba(255,255,255,0.12)"
      strokeWidth={0.5}
      style={{
        animation: `intro-bubble-float ${3 + Math.random() * 2}s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// ──────────────────────────────────────────────
// Animated Claw SVG (chomping)
// ──────────────────────────────────────────────

interface ClawSVGProps {
  chomping: boolean;
  size?: number;
}

function ClawSVG({ chomping, size = 160 }: ClawSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-80 -80 160 160"
      style={{ overflow: "visible" }}
    >
      {/* Bottom jaw — stationary */}
      <g>
        <path
          d="M-50,8 C-50,8 -30,45 5,52 C25,55 55,40 65,18 C65,18 45,30 30,26 C10,20 -20,10 -50,8Z"
          fill="#8B0000"
          stroke="#aa0000"
          strokeWidth="1"
        />
        <path
          d="M-10,48 L-6,42 M5,52 L8,45 M20,50 L22,43 M35,42 L36,35 M48,32 L48,26"
          stroke="#cc2222"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {/* Top jaw — animated */}
      <g
        style={{
          transformOrigin: "-50px 0px",
          transition: "transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: chomping ? "rotate(-28deg)" : "rotate(0deg)",
        }}
      >
        <path
          d="M-50,-5 C-50,-5 -30,-45 5,-52 C25,-55 55,-35 65,-10 C65,-10 45,-25 30,-22 C10,-17 -20,-7 -50,-5Z"
          fill="#cc0000"
          stroke="#ee2222"
          strokeWidth="1"
        />
        <path
          d="M-30,-30 C-20,-42 10,-48 30,-35"
          fill="none"
          stroke="#ff4444"
          strokeWidth="1"
          opacity="0.4"
        />
        <path
          d="M-10,-47 L-6,-40 M5,-52 L8,-44 M20,-49 L22,-42 M35,-38 L36,-31 M48,-25 L48,-18"
          stroke="#ff3333"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {/* Joint */}
      <circle
        cx={-50}
        cy={2}
        r={12}
        fill="#550000"
        stroke="#770000"
        strokeWidth="1.5"
      />
      <circle cx={-50} cy={2} r={6} fill="#440000" />

      {/* Glow effect when chomping */}
      {chomping && (
        <circle
          cx={30}
          cy={0}
          r={15}
          fill="rgba(255, 50, 0, 0.4)"
          style={{ animation: "intro-chomp-flash 0.12s ease-out" }}
        />
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────
// Main IntroSplash Component
// ──────────────────────────────────────────────

interface IntroSplashProps {
  onComplete: () => void;
  duration?: number;
  skippable?: boolean;
}

type Phase = "underwater" | "chomping" | "satisfied" | "zoom-out" | "done";

const FISH_DATA = [
  {
    x: 200,
    y: 140,
    size: 20,
    color: "#5599bb",
    delay: 200,
    direction: "right" as const,
  },
  {
    x: 520,
    y: 200,
    size: 28,
    color: "#77bbdd",
    delay: 0,
    direction: "left" as const,
  },
  {
    x: 350,
    y: 320,
    size: 18,
    color: "#4488aa",
    delay: 400,
    direction: "right" as const,
  },
  {
    x: 150,
    y: 280,
    size: 24,
    color: "#6699cc",
    delay: 100,
    direction: "left" as const,
  },
  {
    x: 480,
    y: 100,
    size: 22,
    color: "#88ccee",
    delay: 300,
    direction: "right" as const,
  },
  {
    x: 600,
    y: 340,
    size: 16,
    color: "#5588aa",
    delay: 500,
    direction: "left" as const,
  },
  {
    x: 100,
    y: 380,
    size: 20,
    color: "#77aacc",
    delay: 150,
    direction: "right" as const,
  },
  {
    x: 400,
    y: 420,
    size: 26,
    color: "#6699bb",
    delay: 250,
    direction: "left" as const,
  },
];

const BUBBLE_DATA = Array.from({ length: 15 }, () => ({
  x: Math.random() * 700 + 50,
  y: Math.random() * 400 + 50,
  size: Math.random() * 4 + 1,
  delay: Math.random() * 3000,
}));

export function IntroSplash({
  onComplete,
  duration = 4200,
  skippable = true,
}: IntroSplashProps) {
  const [phase, setPhase] = useState<Phase>("underwater");
  const [eatenFish, setEatenFish] = useState<Set<number>>(new Set());
  const [chomping, setChomping] = useState(false);
  const [clawPos, setClawPos] = useState({ x: -200, y: 250 });
  const [showText, setShowText] = useState(false);
  const [swimTick, setSwimTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase("zoom-out");
    setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 600);
  }, [onComplete]);

  // Gentle swim animation for fish using requestAnimationFrame
  useEffect(() => {
    let startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      setSwimTick(elapsed);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Get swim offset for a fish
  const getSwimOffset = (index: number) => {
    const speed = 0.4 + (index % 3) * 0.15;
    const ampX = 12 + (index % 4) * 4;
    const ampY = 5 + (index % 3) * 3;
    const phaseOffset = index * 0.8;
    return {
      x: Math.sin(swimTick * speed + phaseOffset) * ampX,
      y: Math.cos(swimTick * speed * 0.7 + phaseOffset) * ampY,
    };
  };

  // Main animation timeline — faster
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 2: Claw enters from left (t=400ms)
    timers.push(
      setTimeout(() => {
        setPhase("chomping");
        setClawPos({ x: 100, y: 220 });
      }, 400),
    );

    // Claw eats fish sequentially — faster intervals
    const fishOrder = [4, 0, 1, 3, 2, 5, 7, 6];
    const startEating = 800;
    const eatInterval = 280;

    fishOrder.forEach((fishIdx, seqIdx) => {
      const eatTime = startEating + seqIdx * eatInterval;
      const fish = FISH_DATA[fishIdx];

      // Move claw towards fish
      timers.push(
        setTimeout(() => {
          setClawPos({ x: fish.x - 60, y: fish.y - 10 });
        }, eatTime - 120),
      );

      // Chomp
      timers.push(
        setTimeout(() => {
          setChomping(true);
        }, eatTime),
      );

      // Eat
      timers.push(
        setTimeout(() => {
          setEatenFish((prev) => new Set([...prev, fishIdx]));
          setChomping(false);
        }, eatTime + 120),
      );
    });

    // Phase 3: Satisfied — claw centers and text appears
    const satisfiedTime = startEating + fishOrder.length * eatInterval + 200;
    timers.push(
      setTimeout(() => {
        setPhase("satisfied");
        setClawPos({ x: 320, y: 220 });
        setShowText(true);
      }, satisfiedTime),
    );

    // Phase 4: Auto zoom-out
    timers.push(setTimeout(finish, duration));

    return () => timers.forEach(clearTimeout);
  }, [duration, finish]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (skippable && !completedRef.current) {
      finish();
    }
  }, [skippable, finish]);

  if (phase === "done") return null;

  const isExiting = phase === "zoom-out";

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none",
        isExiting && "pointer-events-none",
      )}
      onClick={handleSkip}
      style={{
        background:
          "radial-gradient(ellipse at 50% 60%, #0a1520 0%, #050a0f 50%, #020305 100%)",
        transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? "scale(1.15)" : "scale(1)",
      }}
    >
      {/* Underwater caustics overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "repeating-conic-gradient(rgba(0,150,200,0.03) 0% 25%, transparent 0% 50%) 50% / 60px 60px",
          animation: "intro-caustics-move 8s linear infinite",
        }}
      />

      {/* Dark water gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,10,20,0.3) 0%, transparent 30%, transparent 70%, rgba(0,5,10,0.5) 100%)",
        }}
      />

      {/* Main underwater scene */}
      <div className="relative w-full max-w-[800px] h-[500px]">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          {/* Water background gradient */}
          <defs>
            <radialGradient id="waterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,40,60,0.3)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <filter
              id="clawShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="8"
                floodColor="#cc0000"
                floodOpacity="0.5"
              />
            </filter>

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern
              id="waves"
              x="0"
              y="0"
              width="200"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 10 Q50 0, 100 10 Q150 20, 200 10"
                fill="none"
                stroke="rgba(100,180,220,0.06)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Water wave pattern */}
          <rect width="800" height="500" fill="url(#waves)" opacity="0.5" />
          <rect width="800" height="500" fill="url(#waterGlow)" />

          {/* Seabed / bottom plants */}
          <g opacity="0.15">
            <path
              d="M0,490 Q20,460 40,490 Q60,450 80,490 Q100,470 120,490 L120,500 L0,500Z"
              fill="#1a3a2a"
            />
            <path
              d="M150,490 Q170,455 190,490 Q210,465 230,490 L230,500 L150,500Z"
              fill="#1a3a2a"
            />
            <path
              d="M400,490 Q420,450 440,490 Q460,460 480,490 Q500,470 520,490 L520,500 L400,500Z"
              fill="#1a3a2a"
            />
            <path
              d="M620,490 Q640,460 660,490 Q680,455 700,490 L700,500 L620,500Z"
              fill="#1a3a2a"
            />
          </g>

          {/* Bubbles */}
          {BUBBLE_DATA.map((b, i) => (
            <Bubble key={i} {...b} />
          ))}

          {/* Fishes — using JS-driven swim animation, no CSS animation conflicts */}
          {FISH_DATA.map((fish, i) => (
            <Fish
              key={i}
              {...fish}
              eaten={eatenFish.has(i)}
              swimOffset={eatenFish.has(i) ? { x: 0, y: 0 } : getSwimOffset(i)}
            />
          ))}

          {/* The Claw */}
          <g
            filter="url(#clawShadow)"
            style={{
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: `translate(${clawPos.x}px, ${clawPos.y}px)`,
            }}
          >
            <ClawSVG chomping={chomping} size={140} />
          </g>

          {/* Impact particles when chomping */}
          {chomping && (
            <g
              style={{
                transform: `translate(${clawPos.x + 80}px, ${clawPos.y}px)`,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.cos((i / 6) * Math.PI * 2) * 20}
                  cy={Math.sin((i / 6) * Math.PI * 2) * 15}
                  r={2}
                  fill="#ff4400"
                  opacity={0.8}
                  style={{
                    animation: `intro-particle-burst 0.25s ease-out forwards`,
                    animationDelay: `${i * 15}ms`,
                  }}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* "CLAWED" Text reveal */}
      <div
        className="absolute flex flex-col items-center gap-2 pointer-events-none"
        style={{
          bottom: "15%",
          transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          opacity: showText ? 1 : 0,
          transform: showText ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter"
          style={{
            background:
              "linear-gradient(135deg, #ff2200 0%, #cc0000 40%, #880000 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(204,0,0,0.5))",
            letterSpacing: "-0.04em",
          }}
        >
          CLAWED
        </h1>
        <p
          className="text-xs sm:text-sm tracking-[0.3em] uppercase font-medium"
          style={{
            color: "rgba(200,200,210,0.6)",
            transition: "opacity 0.4s ease 0.2s",
            opacity: showText ? 1 : 0,
          }}
        >
          Personal Assistant for People on the Go
        </p>
      </div>

      {/* Skip hint */}
      {skippable && phase !== "zoom-out" && (
        <div
          className="absolute bottom-6 text-xs tracking-wider uppercase"
          style={{
            color: "rgba(255,255,255,0.25)",
            animation: "intro-fade-in 0.8s ease-out 1.5s both",
          }}
        >
          Click anywhere to skip
        </div>
      )}

      {/* Loading bar at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/50">
        <div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #cc0000, #ff4400)",
            animation: `intro-loading-bar ${duration}ms linear forwards`,
          }}
        />
      </div>

      {/* Scoped keyframes — no conflict with global animations */}
      <style>{`
        @keyframes intro-caustics-move {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(-60px, -60px) rotate(5deg); }
        }

        @keyframes intro-bubble-float {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.12;
          }
          50% {
            transform: translateY(-20px);
            opacity: 0.06;
          }
        }

        @keyframes intro-chomp-flash {
          0% { opacity: 0.6; }
          100% { opacity: 0; }
        }

        @keyframes intro-particle-burst {
          0% {
            opacity: 0.9;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translate(10px, -5px);
          }
        }

        @keyframes intro-loading-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes intro-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
