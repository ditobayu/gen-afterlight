import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

type BottleSceneProps = {
  variant?: 'hero' | 'product' | 'chamber'
  progress?: number
  className?: string
}

/** A deliberately asymmetric, heavy-walled glass vessel. No downloaded models or maps. */
function vesselShape(liquid = false) {
  const s = new THREE.Shape()
  if (liquid) {
    s.moveTo(-0.64, -1.17)
    s.quadraticCurveTo(-0.65, -1.28, -0.50, -1.29)
    s.lineTo(0.48, -1.29)
    s.quadraticCurveTo(0.64, -1.27, 0.65, -1.13)
    s.lineTo(0.65, 0.53)
    s.quadraticCurveTo(0.30, 0.51, 0.0, 0.53)
    s.quadraticCurveTo(-0.30, 0.55, -0.64, 0.53)
    s.closePath()
  } else {
    s.moveTo(-0.65, -1.42)
    s.quadraticCurveTo(-0.83, -1.42, -0.83, -1.22)
    s.lineTo(-0.83, 0.76)
    s.bezierCurveTo(-0.83, 0.96, -0.72, 1.11, -0.56, 1.13)
    s.lineTo(0.52, 1.21)
    s.bezierCurveTo(0.73, 1.22, 0.83, 1.09, 0.83, 0.88)
    s.lineTo(0.83, -1.22)
    s.quadraticCurveTo(0.83, -1.42, 0.65, -1.42)
    s.closePath()
  }
  return s
}

function makeLabel() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 1024, 1024)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ede5d6'
  ctx.font = '60px Georgia, serif'
  const word = 'AFTERLIGHT'
  const spacing = 10
  const width = ctx.measureText(word).width + spacing * (word.length - 1)
  let x = 512 - width / 2
  ctx.textAlign = 'left'
  for (const c of word) {
    ctx.fillText(c, x, 466)
    x += ctx.measureText(c).width + spacing
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d4b98d'
  ctx.font = '15px Arial, sans-serif'
  ctx.fillText('T H E   L A S T   S U N S E T', 512, 521)
  ctx.fillStyle = 'rgba(237,229,214,.58)'
  ctx.fillRect(444, 575, 136, 1)
  ctx.font = '13px Arial, sans-serif'
  ctx.fillText('E X T R A I T   D E   P A R F U M', 512, 624)
  ctx.fillText('5 0   M L   /   0 0 1', 512, 658)
  ctx.strokeStyle = 'rgba(237,229,214,.74)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(512, 285, 24, Math.PI * .1, Math.PI * 1.9)
  ctx.stroke()
  ctx.fillStyle = '#d98937'
  ctx.fillRect(483, 285, 58, 1)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function ReflectionStudio({ variant }: { variant: string }) {
  return (
    <>
      <ambientLight intensity={0.46} color="#ead5b6" />
      <directionalLight position={[-4, 6, 7]} color="#fff0d2" intensity={2.5} />
      <spotLight position={[5, 4, -5]} color="#ffbd69" intensity={28} angle={.6} penumbra={1} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#100c09']} />
        <Lightformer form="rect" intensity={4.5} color="#fff4df" position={[-3, 1, 2]} scale={[.65, 6, 1]} rotation={[0, Math.PI / 3, 0]} />
        <Lightformer form="rect" intensity={3.3} color="#ffdfa7" position={[3, 2, 1]} scale={[.35, 5, 1]} rotation={[0, -Math.PI / 3, 0]} />
        <Lightformer form="rect" intensity={3.5} color="#fff8e9" position={[0, 5, 0]} scale={[4, 1, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={variant === 'product' ? 2.4 : 1.5} color="#ffb351" position={[1, -1, -3]} scale={[3, 5, 1]} rotation={[0, Math.PI, 0]} />
        <Lightformer form="rect" intensity={.6} color="#fff0d5" position={[0, 0, 5]} scale={[5, .22, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f0e9dc" position={[-1, 3, 4]} scale={[4, 1, 1]} rotation={[-Math.PI / 6, 0, 0]} />
      </Environment>
    </>
  )
}

function Bottle({ variant, progress = 0 }: BottleSceneProps) {
  const group = useRef<THREE.Group>(null!)
  const cap = useRef<THREE.Group>(null!)
  const drag = useRef({ active: false, x: 0, rotation: 0, velocity: 0 })
  const [hovered, setHovered] = useState(false)
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = media.matches }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const label = useMemo(makeLabel, [])
  const bodyGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(vesselShape(), {
      depth: .64, steps: 1, bevelEnabled: true, bevelSegments: 8,
      bevelSize: .14, bevelThickness: .14, curveSegments: 24,
    })
    geo.translate(0, 0, -.32)
    geo.computeVertexNormals()
    return geo
  }, [])
  const liquidGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(vesselShape(true), {
      depth: .51, bevelEnabled: true, bevelSegments: 5,
      bevelSize: .035, bevelThickness: .035, curveSegments: 20,
    })
    geo.translate(0, 0, -.255)
    return geo
  }, [])

  useFrame(({ clock, pointer }, delta) => {
    const reduced = reducedMotion.current
    const time = reduced ? 0 : clock.elapsedTime
    const g = group.current
    if (!g) return
    const damping = 1 - Math.exp(-delta * 3.4)
    if (!drag.current.active && !reduced) {
      drag.current.rotation += drag.current.velocity * delta
      drag.current.velocity *= Math.exp(-delta * 3)
    }
    const hero = variant !== 'product'
    if (reduced) drag.current.velocity = 0
    const chamberAmount = THREE.MathUtils.smoothstep(progress, .56, .94)
    const targetY = -.34 + (hero ? (reduced ? 0 : pointer.x * .13) : drag.current.rotation)
      + (variant === 'chamber' ? (1 - chamberAmount) * 1.1 : 0)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, damping)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, .045 - (reduced ? 0 : pointer.y) * (hero ? .045 : .02), damping)
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, (hero ? -.075 : .055) + Math.sin(time * .28) * .014, damping)
    g.position.y = -.04 + Math.sin(time * .6) * .047
    if (variant === 'chamber') {
      g.scale.setScalar(.75 + chamberAmount * .25)
    }
  })

  function down(event: ThreeEvent<PointerEvent>) {
    if (variant !== 'product') return
    event.stopPropagation()
    drag.current.active = true
    drag.current.x = event.clientX
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
  }
  function move(event: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return
    const dx = event.clientX - drag.current.x
    drag.current.rotation += dx * .009
    drag.current.velocity = dx * .2
    drag.current.x = event.clientX
  }
  function up(event: ThreeEvent<PointerEvent>) {
    drag.current.active = false
    ;(event.target as HTMLElement).releasePointerCapture?.(event.pointerId)
  }

  return (
    <group ref={group} rotation={[.045, -.34, -.075]} onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* A single polished outer wall and a distinct liquid volume create genuine depth. */}
      <mesh geometry={bodyGeometry} renderOrder={2}>
        <meshPhysicalMaterial color="#c9b590" transmission={1} thickness={.82} roughness={.065}
          metalness={0} ior={1.48} clearcoat={1} clearcoatRoughness={.045}
          attenuationColor="#b67e3a" attenuationDistance={2.8} envMapIntensity={1.65}
          side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={liquidGeometry} renderOrder={1}>
        <meshPhysicalMaterial color="#e5ad4c" transmission={.88} thickness={.78} roughness={.085}
          ior={1.33} metalness={0} attenuationColor="#c68c30" attenuationDistance={2.3}
          envMapIntensity={1.15} clearcoat={.8} />
      </mesh>
      {/* A translucent honey heart lets the outer wall retain luminous depth. */}
      <mesh geometry={liquidGeometry} scale={[.985, .985, .95]}>
        <meshPhysicalMaterial color="#b5731c" metalness={.05} roughness={.14}
          clearcoat={1} clearcoatRoughness={.08} envMapIntensity={1.1}
          emissive="#9b4f0b" emissiveIntensity={.045} />
      </mesh>
      {/* The meniscus catches a thin, physically separate line of light. */}
      <mesh position={[0, .555, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.27, .52]} />
        <meshPhysicalMaterial color="#df9f43" transmission={.6} roughness={.06} ior={1.33}
          transparent opacity={.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Thick luminous foot, cut into the glass rather than a decorative plinth. */}
      <RoundedBox args={[1.44, .10, .67]} radius={.045} smoothness={5} position={[0, -1.37, 0]}>
        <meshPhysicalMaterial color="#d49a58" transmission={.95} thickness={.8} roughness={.05}
          ior={1.48} envMapIntensity={2.5} />
      </RoundedBox>
      <mesh position={[0, -.12, .467]} renderOrder={5}>
        <planeGeometry args={[1.46, 1.7]} />
        <meshBasicMaterial map={label} transparent opacity={.94} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={cap} position={[0, 1.40, 0]}>
        <RoundedBox args={[.72, .29, .67]} radius={.055} smoothness={5} position={[0, -.16, 0]}>
          <meshPhysicalMaterial color="#777065" metalness={1} roughness={.18} envMapIntensity={1.6} />
        </RoundedBox>
        <RoundedBox args={[1.02, .53, .92]} radius={.075} smoothness={7} position={[0, .16, 0]}>
          <meshPhysicalMaterial color={hovered && variant === 'product' ? '#817a70' : '#716b60'} metalness={1}
            roughness={.2} clearcoat={1} clearcoatRoughness={.12} envMapIntensity={1.7} />
        </RoundedBox>
        <RoundedBox args={[1.025, .035, .924]} radius={.015} smoothness={4} position={[0, -.045, 0]}>
          <meshStandardMaterial color="#928a78" metalness={1} roughness={.15} envMapIntensity={1.8} />
        </RoundedBox>
        <RoundedBox args={[.84, .012, .73]} radius={.04} smoothness={4} position={[0, .43, 0]}>
          <meshPhysicalMaterial color="#6b655b" metalness={1} roughness={.22} envMapIntensity={1.3} />
        </RoundedBox>
      </group>
    </group>
  )
}

export default function BottleScene({ variant = 'hero', progress = 0, className = '' }: BottleSceneProps) {
  return (
    <div className={className} data-cursor={variant === 'product' ? 'DRAG TO ROTATE' : undefined} style={{ width: '100%', height: '100%', touchAction: variant === 'product' ? 'pan-y' : 'auto' }}
      aria-label="Sculptural AFTERLIGHT fragrance bottle in smoked glass and dark titanium">
      <Canvas frameloop="always" dpr={[1, 1.75]} camera={{ position: [0, .05, 7.1], fov: 32 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15 }}>
        <Suspense fallback={null}>
          <ReflectionStudio variant={variant} />
          <Bottle variant={variant} progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  )
}
