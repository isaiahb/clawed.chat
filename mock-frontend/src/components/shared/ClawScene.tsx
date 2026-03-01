import {
  useRef,
  useMemo,
  Suspense,
  memo,
  useState,
  useEffect,
  useCallback,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

// ──────────────────────────────────────────────
// Default model paths (encoded for spaces in URL)
// ──────────────────────────────────────────────

const GLB_PATH = "/Assets/Lobster Claw/files/Live_Render File.glb";
const STL_PATH = "/Assets/Lobster Claw/files/LobsterClaw.stl";

// Encode spaces properly for browser fetch reliability
function encodeAssetPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

const GLB_URL = encodeAssetPath(GLB_PATH);
const STL_URL = encodeAssetPath(STL_PATH);

// ──────────────────────────────────────────────
// Asset availability check
// ──────────────────────────────────────────────

const assetCache = new Map<string, "pending" | "ok" | "fail">();

async function checkAssetAvailable(url: string): Promise<boolean> {
  const cached = assetCache.get(url);
  if (cached === "ok") return true;
  if (cached === "fail") return false;

  assetCache.set(url, "pending");
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ok = res.ok;
    assetCache.set(url, ok ? "ok" : "fail");
    return ok;
  } catch {
    assetCache.set(url, "fail");
    return false;
  }
}

// ──────────────────────────────────────────────
// WebGL Context Loss Recovery
// ──────────────────────────────────────────────

function WebGLContextWatcher({ onContextLost }: { onContextLost: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (e: Event) => {
      e.preventDefault();
      console.warn("[ClawScene] WebGL context lost");
      onContextLost();
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
    };
  }, [gl, onContextLost]);

  return null;
}

// ──────────────────────────────────────────────
// GLB Claw Mesh (primary — higher quality, includes materials)
// ──────────────────────────────────────────────

interface ClawMeshProps {
  url?: string;
  scale?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  autoRotate?: boolean;
  rotationSpeed?: number;
  floatAmplitude?: number;
  floatSpeed?: number;
  onClick?: () => void;
  hovered?: boolean;
  useOriginalMaterials?: boolean;
}

const GLBClawMesh = memo(function GLBClawMesh({
  url = GLB_URL,
  scale = 0.04,
  color = "#cc0000",
  emissive = "#660000",
  emissiveIntensity = 0.4,
  roughness = 0.35,
  metalness = 0.7,
  autoRotate = true,
  rotationSpeed = 0.005,
  floatAmplitude = 0.15,
  floatSpeed = 1.5,
  onClick,
  hovered = false,
  useOriginalMaterials = true,
}: ClawMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  // Clone the scene so we don't mutate the cached original
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Center the model
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.sub(center);

    // Optionally override materials with our red claw look
    if (!useOriginalMaterials) {
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(emissive),
            emissiveIntensity,
            roughness,
            metalness,
            side: THREE.DoubleSide,
            envMapIntensity: 1.2,
          });
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    } else {
      // Keep original materials but enable shadows and tweak envMapIntensity
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (
            mesh.material &&
            (mesh.material as THREE.MeshStandardMaterial).envMapIntensity !==
              undefined
          ) {
            (mesh.material as THREE.MeshStandardMaterial).envMapIntensity = 1.4;
          }
        }
      });
    }

    return clone;
  }, [
    scene,
    useOriginalMaterials,
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  ]);

  // Animate rotation and floating
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (autoRotate) {
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
      groupRef.current.rotation.z = Math.cos(t * 0.4) * 0.04;
    }

    // Floating bob
    groupRef.current.position.y = Math.sin(t * floatSpeed) * floatAmplitude;

    // Hover scale effect
    const targetScale = hovered ? scale * 1.08 : scale;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1,
    );
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]} onClick={onClick}>
      <primitive object={clonedScene} />
    </group>
  );
});

// ──────────────────────────────────────────────
// STL Claw Mesh (fallback — geometry only, we apply materials)
// ──────────────────────────────────────────────

const STLClawMesh = memo(function STLClawMesh({
  url = STL_URL,
  scale = 0.04,
  color = "#cc0000",
  emissive = "#660000",
  emissiveIntensity = 0.4,
  roughness = 0.35,
  metalness = 0.7,
  autoRotate = true,
  rotationSpeed = 0.005,
  floatAmplitude = 0.15,
  floatSpeed = 1.5,
  onClick,
  hovered = false,
}: ClawMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useLoader(STLLoader, url);

  // Center and normalize the geometry
  const centeredGeometry = useMemo(() => {
    const geo = geometry.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    geo.computeVertexNormals();
    return geo;
  }, [geometry]);

  // Animate rotation and floating
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    if (autoRotate) {
      meshRef.current.rotation.y += rotationSpeed;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
      meshRef.current.rotation.z = Math.cos(t * 0.4) * 0.05;
    }

    // Floating bob
    meshRef.current.position.y = Math.sin(t * floatSpeed) * floatAmplitude;

    // Hover scale effect
    const targetScale = hovered ? scale * 1.08 : scale;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1,
    );
  });

  return (
    <mesh
      ref={meshRef}
      geometry={centeredGeometry}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
      onClick={onClick}
      rotation={[Math.PI / 2, 0, Math.PI]}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
        metalness={metalness}
        side={THREE.DoubleSide}
        envMapIntensity={1.2}
      />
    </mesh>
  );
});

// ──────────────────────────────────────────────
// Error Boundary for 3D content (class component required)
// Catches both render errors AND suspense-thrown errors
// ──────────────────────────────────────────────

interface ErrorBoundary3DProps {
  onError: (error: Error) => void;
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundary3DState {
  hasError: boolean;
}

class ErrorBoundary3D extends Component<
  ErrorBoundary3DProps,
  ErrorBoundary3DState
> {
  constructor(props: ErrorBoundary3DProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundary3DState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.warn("[ClawScene] 3D error caught by boundary:", error.message);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

// ──────────────────────────────────────────────
// Smart Model Loader with pre-check, retry, and fallback chain:
//   1. Try GLB (best quality)
//   2. Try STL (fallback)
//   3. Show procedural placeholder (last resort)
// ──────────────────────────────────────────────

type ModelState = "checking" | "glb" | "stl" | "placeholder";

function ClawModelWithFallback(
  props: ClawMeshProps & { glbUrl?: string; stlUrl?: string },
) {
  const { glbUrl = GLB_URL, stlUrl = STL_URL, ...meshProps } = props;
  const [modelState, setModelState] = useState<ModelState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Pre-check asset availability before attempting to load
  useEffect(() => {
    let cancelled = false;

    async function resolveModel() {
      // Try GLB first
      const glbOk = await checkAssetAvailable(glbUrl);
      if (cancelled) return;

      if (glbOk) {
        setModelState("glb");
        return;
      }

      console.warn("[ClawScene] GLB not available, trying STL fallback");

      // Try STL
      const stlOk = await checkAssetAvailable(stlUrl);
      if (cancelled) return;

      if (stlOk) {
        setModelState("stl");
        return;
      }

      console.warn("[ClawScene] STL not available, using placeholder");
      setModelState("placeholder");
    }

    resolveModel();
    return () => {
      cancelled = true;
    };
  }, [glbUrl, stlUrl, retryCount]);

  const handleGLBError = useCallback(() => {
    console.warn("[ClawScene] GLB load error, falling back to STL");
    // Clear the failed GLB from drei cache so retry can work
    try {
      useGLTF.clear(glbUrl);
    } catch {
      // ignore — cache clear is best-effort
    }
    setModelState("stl");
  }, [glbUrl]);

  const handleSTLError = useCallback(() => {
    console.warn("[ClawScene] STL load error, using placeholder");
    setModelState("placeholder");
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      // Reset asset cache so checks run fresh
      assetCache.delete(glbUrl);
      assetCache.delete(stlUrl);
      setRetryCount((c) => c + 1);
      setModelState("checking");
    }
  }, [retryCount, glbUrl, stlUrl]);

  if (modelState === "checking") {
    return <LoadingFallback />;
  }

  if (modelState === "placeholder") {
    return (
      <ProceduralClaw
        {...meshProps}
        onRetry={handleRetry}
        canRetry={retryCount < maxRetries}
      />
    );
  }

  if (modelState === "stl") {
    return (
      <ErrorBoundary3D
        onError={handleSTLError}
        fallback={
          <ProceduralClaw
            {...meshProps}
            onRetry={handleRetry}
            canRetry={retryCount < maxRetries}
          />
        }
      >
        <STLClawMesh {...meshProps} url={stlUrl} />
      </ErrorBoundary3D>
    );
  }

  // modelState === "glb"
  return (
    <ErrorBoundary3D onError={handleGLBError} fallback={<LoadingFallback />}>
      <GLBClawMesh {...meshProps} url={glbUrl} />
    </ErrorBoundary3D>
  );
}

// ──────────────────────────────────────────────
// Loading Fallback (spinning octahedron inside Canvas)
// ──────────────────────────────────────────────

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 2;
    meshRef.current.rotation.x = Math.sin(t) * 0.3;
    meshRef.current.position.y = Math.sin(t * 1.5) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color="#cc0000"
        emissive="#440000"
        emissiveIntensity={0.5}
        wireframe
      />
    </mesh>
  );
}

// ──────────────────────────────────────────────
// Procedural Claw Placeholder (last resort — no files needed)
// A stylized claw/pincer shape made from basic geometries
// ──────────────────────────────────────────────

function ProceduralClaw({
  scale = 0.04,
  color = "#cc0000",
  emissive = "#660000",
  emissiveIntensity = 0.4,
  roughness = 0.35,
  metalness = 0.7,
  autoRotate = true,
  rotationSpeed = 0.005,
  floatAmplitude = 0.15,
  floatSpeed = 1.5,
  onClick,
  onRetry,
  canRetry,
}: ClawMeshProps & { onRetry?: () => void; canRetry?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const retriedRef = useRef(false);

  // Attempt one automatic retry after a delay
  useEffect(() => {
    if (canRetry && onRetry && !retriedRef.current) {
      retriedRef.current = true;
      const timer = setTimeout(() => {
        onRetry();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canRetry, onRetry]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (autoRotate) {
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
      groupRef.current.rotation.z = Math.cos(t * 0.4) * 0.04;
    }

    groupRef.current.position.y = Math.sin(t * floatSpeed) * floatAmplitude;
  });

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        emissiveIntensity,
        roughness,
        metalness,
        side: THREE.DoubleSide,
      }),
    [color, emissive, emissiveIntensity, roughness, metalness],
  );

  const displayScale = scale * 18;

  return (
    <group
      ref={groupRef}
      scale={[displayScale, displayScale, displayScale]}
      onClick={onClick}
    >
      {/* Body / palm of the claw */}
      <mesh material={mat} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
      </mesh>
      {/* Left pincer */}
      <mesh
        material={mat}
        position={[-0.25, 0.55, 0]}
        rotation={[0, 0, Math.PI / 6]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.12, 0.6, 8, 12]} />
      </mesh>
      {/* Right pincer */}
      <mesh
        material={mat}
        position={[0.25, 0.55, 0]}
        rotation={[0, 0, -Math.PI / 6]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.12, 0.6, 8, 12]} />
      </mesh>
      {/* Arm segment */}
      <mesh material={mat} position={[0, -0.55, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.18, 0.5, 8, 12]} />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────
// Particle Field (embers / sparks)
// ──────────────────────────────────────────────

interface ParticleFieldProps {
  count?: number;
  spread?: number;
  color?: string;
  size?: number;
}

const ParticleField = memo(function ParticleField({
  count = 50,
  spread = 5,
  color = "#cc3300",
  size = 0.015,
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * spread;
      pos[i3 + 1] = (Math.random() - 0.5) * spread;
      pos[i3 + 2] = (Math.random() - 0.5) * spread;
      vel[i3] = (Math.random() - 0.5) * 0.002;
      vel[i3 + 1] = Math.random() * 0.005 + 0.002;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions: pos, velocities: vel };
  }, [count, spread]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArr = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArr[i3] += velocities[i3];
      posArr[i3 + 1] += velocities[i3 + 1];
      posArr[i3 + 2] += velocities[i3 + 2];

      // Reset particles that float too high
      if (posArr[i3 + 1] > spread / 2) {
        posArr[i3] = (Math.random() - 0.5) * spread;
        posArr[i3 + 1] = -spread / 2;
        posArr[i3 + 2] = (Math.random() - 0.5) * spread;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
});

// ──────────────────────────────────────────────
// Subtle accent ring
// ──────────────────────────────────────────────

const GlowRing = memo(function GlowRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();
    ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.08;
    ringRef.current.rotation.z = t * 0.15;
    const pulse = 1 + Math.sin(t * 2) * 0.03;
    ringRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[2.4, 0.008, 12, 80]} />
      <meshBasicMaterial color="#cc0000" transparent opacity={0.15} />
    </mesh>
  );
});

// ──────────────────────────────────────────────
// Main Scene Component
// ──────────────────────────────────────────────

interface ClawSceneProps {
  className?: string;
  /** @deprecated Use glbUrl/stlUrl instead */
  stlUrl?: string;
  glbUrl?: string;
  scale?: number;
  showParticles?: boolean;
  showRing?: boolean;
  showShadow?: boolean;
  showControls?: boolean;
  autoRotate?: boolean;
  rotationSpeed?: number;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  backgroundColor?: string;
  style?: React.CSSProperties;
  onClawClick?: () => void;
  /** Use original GLB materials (true) or override with red (false) */
  useOriginalMaterials?: boolean;
}

export const ClawScene = memo(function ClawScene({
  className = "",
  stlUrl = STL_URL,
  glbUrl = GLB_URL,
  scale = 0.04,
  showParticles = true,
  showRing = true,
  showShadow = true,
  showControls = false,
  autoRotate = true,
  rotationSpeed = 0.005,
  cameraPosition = [0, 1.5, 5],
  cameraFov = 40,
  backgroundColor = "transparent",
  style,
  onClawClick,
  useOriginalMaterials = true,
}: ClawSceneProps) {
  // Key used to force full Canvas remount on WebGL context loss
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasError, setCanvasError] = useState(false);

  const handleContextLost = useCallback(() => {
    // Remount the entire Canvas to recover from context loss
    setCanvasKey((k) => k + 1);
  }, []);

  const handleCanvasError = useCallback(() => {
    console.warn("[ClawScene] Canvas-level error, showing static fallback");
    setCanvasError(true);
  }, []);

  // If Canvas itself fails (e.g. WebGL not supported), show a static fallback
  if (canvasError) {
    return (
      <div className={className} style={style}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              backgroundColor === "transparent"
                ? "radial-gradient(ellipse at center, rgba(204,0,0,0.08), transparent)"
                : backgroundColor,
            borderRadius: "12px",
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{ width: "40%", height: "40%", opacity: 0.6 }}
          >
            <circle cx="50" cy="55" r="18" fill="#cc0000" opacity="0.8" />
            <ellipse
              cx="40"
              cy="35"
              rx="5"
              ry="15"
              fill="#cc0000"
              opacity="0.8"
              transform="rotate(-15 40 35)"
            />
            <ellipse
              cx="60"
              cy="35"
              rx="5"
              ry="15"
              fill="#cc0000"
              opacity="0.8"
              transform="rotate(15 60 35)"
            />
            <ellipse
              cx="50"
              cy="72"
              rx="7"
              ry="12"
              fill="#cc0000"
              opacity="0.7"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ErrorBoundary3D onError={handleCanvasError}>
        <Canvas
          key={canvasKey}
          shadows
          camera={{
            position: cameraPosition,
            fov: cameraFov,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: backgroundColor === "transparent",
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          style={{
            background: backgroundColor,
            width: "100%",
            height: "100%",
          }}
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
          onCreated={({ gl }) => {
            // Handle context loss at the GL level as well
            const canvas = gl.domElement;
            const handleLost = (e: Event) => {
              e.preventDefault();
              handleContextLost();
            };
            canvas.addEventListener("webglcontextlost", handleLost);
          }}
        >
          {/* WebGL context watcher for runtime context loss */}
          <WebGLContextWatcher onContextLost={handleContextLost} />

          {/* Lighting */}
          <ambientLight intensity={0.35} color="#331111" />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.6}
            color="#ffcccc"
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
          <directionalLight
            position={[-3, 4, -3]}
            intensity={0.5}
            color="#ff4444"
          />
          <pointLight
            position={[0, -2, 3]}
            intensity={0.7}
            color="#cc0000"
            distance={10}
          />
          <pointLight
            position={[0, 3, -2]}
            intensity={0.35}
            color="#ff6644"
            distance={8}
          />

          {/* Environment for reflections */}
          <Environment preset="night" />

          {/* The Claw — GLB → STL → procedural fallback chain */}
          <Suspense fallback={<LoadingFallback />}>
            <ClawModelWithFallback
              glbUrl={glbUrl}
              stlUrl={stlUrl}
              scale={scale}
              autoRotate={autoRotate}
              rotationSpeed={rotationSpeed}
              onClick={onClawClick}
              color="#cc0000"
              emissive="#550000"
              emissiveIntensity={0.5}
              roughness={0.3}
              metalness={0.75}
              useOriginalMaterials={useOriginalMaterials}
            />
          </Suspense>

          {/* Decorations */}
          {showParticles && (
            <ParticleField count={40} spread={6} color="#cc3300" size={0.018} />
          )}
          {showRing && <GlowRing />}

          {/* Contact shadow */}
          {showShadow && (
            <ContactShadows
              position={[0, -1.8, 0]}
              opacity={0.35}
              scale={8}
              blur={2}
              far={3.5}
              color="#440000"
              resolution={256}
            />
          )}

          {/* Camera controls */}
          {showControls && (
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={3}
              maxDistance={12}
              autoRotate={false}
              target={[0, 0, 0]}
            />
          )}

          {/* Fog for depth — matched to dark grey background */}
          <fog attach="fog" args={["#1a1a1f", 10, 22]} />
        </Canvas>
      </ErrorBoundary3D>
    </div>
  );
});

// ──────────────────────────────────────────────
// Compact / Mini claw for icons, headers, etc.
// ──────────────────────────────────────────────

interface MiniClawProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const MiniClaw = memo(function MiniClaw({
  className = "",
  size = 80,
  style,
}: MiniClawProps) {
  return (
    <ClawScene
      className={className}
      style={{ width: size, height: size, ...style }}
      scale={0.03}
      showParticles={false}
      showRing={false}
      showShadow={false}
      showControls={false}
      cameraPosition={[0, 1, 4]}
      cameraFov={35}
      rotationSpeed={0.008}
    />
  );
});

// Preload the GLB for faster loading (uses encoded URL)
// Wrapped in try/catch so a preload failure doesn't crash the module
try {
  useGLTF.preload(GLB_URL);
} catch {
  // Preload failure is non-fatal — the component will handle it via fallback chain
}

export default ClawScene;
