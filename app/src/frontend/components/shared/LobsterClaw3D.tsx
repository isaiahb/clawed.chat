import { Suspense, useRef, useMemo, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Float, useGLTF } from "@react-three/drei"
import * as THREE from "three"

/* ────────────────────────────────────────────
 *  Inner mesh – loads the decimated GLB,
 *  centres it, applies material, and slowly
 *  auto-rotates.
 * ──────────────────────────────────────────── */
function ClawMesh({ url }: { url: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { scene } = useGLTF(url)

  // Extract the first mesh geometry from the loaded GLB scene
  const centeredGeometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null

    scene.traverse((child) => {
      if (!geo && (child as THREE.Mesh).isMesh) {
        geo = ((child as THREE.Mesh).geometry as THREE.BufferGeometry).clone()
      }
    })

    if (!geo) return new THREE.BoxGeometry(1, 1, 1) // fallback

    geo.computeBoundingBox()
    geo.computeVertexNormals()

    const box = geo.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    geo.translate(-center.x, -center.y, -center.z)

    // Scale so the longest axis = ~3 units
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 3 / maxDim
    geo.scale(scale, scale, scale)

    return geo
  }, [scene])

  // Slow auto-rotate
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <mesh ref={meshRef} geometry={centeredGeometry}>
      <meshPhysicalMaterial
        color="#cc0000"
        roughness={0.35}
        metalness={0.15}
        clearcoat={0.4}
        clearcoatRoughness={0.25}
        envMapIntensity={1.2}
      />
    </mesh>
  )
}

/* ────────────────────────────────────────────
 *  Loading spinner shown while GLB streams in
 * ──────────────────────────────────────────── */
function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-claw-red/30 border-t-claw-red animate-spin" />
    </div>
  )
}

/* ────────────────────────────────────────────
 *  Public component – drop into any layout
 *
 *  Uses the decimated GLB (263 KB) instead of
 *  the original STL (56 MB).
 * ──────────────────────────────────────────── */
const GLB_URL = "/assets/claw.glb"

export function LobsterClaw3D({ className = "" }: { className?: string }) {
  const [ready, setReady] = useState(false)

  // Fade-in once canvas is painted
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{opacity: ready ? 1 : 0, transition: "opacity 0.6s ease"}}
    >
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{position: [0, 1.5, 5], fov: 40}}
          dpr={[1, 2]}
          gl={{antialias: true, alpha: true}}
          style={{background: "transparent"}}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={1.8} />
          <directionalLight
            position={[-4, 3, -3]}
            intensity={0.5}
            color="#ff6666"
          />
          <pointLight position={[0, -2, 3]} intensity={0.3} color="#ff4444" />

          {/* Floating wrapper for a gentle bob effect */}
          <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.6}>
            <ClawMesh url={GLB_URL} />
          </Float>

          {/* Environment map for reflections (no background) */}
          <Environment preset="city" />
        </Canvas>
      </Suspense>
    </div>
  )
}

// Preload the GLB so it starts fetching early
useGLTF.preload(GLB_URL)

export default LobsterClaw3D
