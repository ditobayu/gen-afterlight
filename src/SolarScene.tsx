import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type SolarProps = { progress: number; className?: string }

const noise = /* glsl */`
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(.11, .27, .53));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 p = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(p),hash(p+vec3(1,0,0)),f.x),
                   mix(hash(p+vec3(0,1,0)),hash(p+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(p+vec3(0,0,1)),hash(p+vec3(1,0,1)),f.x),
                   mix(hash(p+vec3(0,1,1)),hash(p+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p) {
    float result = 0.0, a = .5;
    mat3 rotation = mat3(0.00, .80, .60, -.80, .36, -.48, -.60, -.48, .64);
    for(int i = 0; i < 5; i++) {
      result += noise3(p) * a;
      p = rotation * p * 2.07 + 9.17;
      a *= .5;
    }
    return result;
  }
`

const solarVertex = /* glsl */`
  uniform float uTime;
  uniform float uCollapse;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vEye;
  ${noise}
  void main() {
    float distortion = fbm(position * 3.2 + uTime * .09);
    float pulse = sin(uTime * .65) * .004;
    vec3 p = position + normal * ((distortion - .5) * (.055 + uCollapse * .16) + pulse);
    vPosition = p;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vEye = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const solarFragment = /* glsl */`
  uniform float uTime;
  uniform float uCollapse;
  uniform float uFade;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vEye;
  ${noise}
  void main() {
    vec3 p = normalize(vPosition);
    float flow = uTime * .035;
    vec3 warp = vec3(fbm(p*2.8+flow),fbm(p*2.8+vec3(4.0,0,0)-flow),fbm(p*2.8+vec3(0,7.0,0)));
    float field = fbm(p * 7.5 + warp * 3.8 + vec3(flow, -flow * 1.4, 0.0));
    float veins = 1.0 - abs(sin(field * 19.0 + fbm(p*17.0) * 2.5));
    float fine = fbm(p * 39.0 + warp * 2.0 - flow * .7);
    float hot = smoothstep(.40, .77, field) * .85 + pow(veins, 8.0) * .40;
    vec3 dark = vec3(.16, .006, .0006);
    vec3 ember = vec3(1.2, .12, .008);
    vec3 gold = vec3(1.75, .65, .10);
    vec3 color = mix(dark, ember, smoothstep(.18, .66, field));
    color = mix(color, gold, clamp(hot + fine*.10, 0.0, 1.0));
    float facing = max(dot(normalize(vNormal), normalize(vEye)), 0.0);
    color *= pow(facing, .32) * .85 + .13;
    float shade = dot(normalize(vNormal), normalize(vec3(-.65, .4, 1.0))) * .5 + .5;
    color *= .45 + shade * .75;
    float rim = pow(1.0 - facing, 4.0);
    color += vec3(.85, .14, .012) * rim * .65;
    color = mix(color, vec3(2.1, .72, .16), uCollapse * .6);
    gl_FragColor = vec4(color, uFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const coronaVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const coronaFragment = /* glsl */`
  uniform float uTime;
  uniform float uCollapse;
  uniform float uFade;
  varying vec2 vUv;
  ${noise}
  void main() {
    vec2 p = (vUv - .5) * 2.0;
    float r = length(p);
    float angle = atan(p.y,p.x);
    float fringe = fbm(vec3(cos(angle)*8.0,sin(angle)*8.0,uTime*.045));
    float radius = .51 + fringe*.018;
    float halo = exp(-abs(r-radius)*19.0) * .46;
    float corona = exp(-abs(r-radius)*115.0) * .75;
    float light = max(0.0, 1.0-r) * .035;
    float rays = pow(fbm(vec3(p * 8.0, uTime*.03)), 3.0);
    float alpha = (halo * (.45 + rays*2.0) + corona + light) * smoothstep(1.0,.68,r);
    vec3 c = mix(vec3(1.0,.13,.012),vec3(1.0,.38,.055),corona);
    gl_FragColor = vec4(c, alpha * (1.0-uCollapse*.35) * uFade);
  }
`

function SolarObject({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null!)
  const sphere = useRef<THREE.Mesh>(null!)
  const particleMesh = useRef<THREE.Points>(null!)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = media.matches }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCollapse: { value: 0 }, uFade: { value: 1 } }), [])
  const particleData = useMemo(() => {
    const count = 470
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996323
      const radius = 1.8 + ((Math.sin(i * 92.71) * 43758.5453) % 1 + 1) * 1.15
      seeds[i * 3] = angle
      seeds[i * 3 + 1] = radius
      seeds[i * 3 + 2] = Math.sin(i * 32.12) * 1.4
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = seeds[i * 3 + 2]
    }
    return { positions, seeds, count }
  }, [])

  useFrame(({ clock, pointer }, delta) => {
    const reduced = reducedMotion.current
    const t = reduced ? 0 : clock.elapsedTime
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1)
    const collapse = THREE.MathUtils.smoothstep(p, .22, .83)
    const transfer = THREE.MathUtils.smoothstep(p, .64, .90) * 1.2
    const fade = 1 - THREE.MathUtils.smoothstep(p, .84, .95)
    uniforms.uTime.value = t
    uniforms.uCollapse.value = collapse
    uniforms.uFade.value = fade
    const scale = 1 - collapse * .96
    const damping = reduced ? 1 : 1-Math.exp(-delta*5)
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, damping))
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, transfer + (reduced ? 0 : pointer.x*.10*(1-collapse)), damping)
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, reduced ? 0 : pointer.y*.07*(1-collapse), damping)
    sphere.current.rotation.y = t * .024
    sphere.current.rotation.z = -.15 + t * .009
    const positions = particleMesh.current.geometry.attributes.position.array as Float32Array
    for (let i=0; i<particleData.count; i++) {
      const index = i*3
      const a = particleData.seeds[index] + t*.018 + collapse*3.8
      const r = particleData.seeds[index+1] * (1-collapse*.985)
      positions[index] = Math.cos(a) * r + transfer
      positions[index+1] = Math.sin(a) * r * .8
      positions[index+2] = particleData.seeds[index+2] * (1-collapse)
    }
    particleMesh.current.geometry.attributes.position.needsUpdate = true
    ;(particleMesh.current.material as THREE.PointsMaterial).opacity = (.38 + Math.sin(t*.4)*.07) * fade
  })

  return (
    <>
      <group ref={group}>
        <mesh position={[0, 0, -.12]}>
          <planeGeometry args={[6.4, 6.4]} />
          <shaderMaterial uniforms={uniforms} vertexShader={coronaVertex} fragmentShader={coronaFragment}
            transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={sphere}>
          <sphereGeometry args={[1.57, 128, 96]} />
          <shaderMaterial uniforms={uniforms} vertexShader={solarVertex} fragmentShader={solarFragment} transparent />
        </mesh>
      </group>
      <points ref={particleMesh} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleData.count} array={particleData.positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#db7232" size={.012} transparent opacity={.4} depthWrite={false}
          blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </>
  )
}

export default function SolarScene({ progress, className = '' }: SolarProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }} aria-label="A living sphere of molten solar light">
      <Canvas frameloop="always" dpr={[1, 1.5]} camera={{ position: [0, 0, 6.4], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1 }}>
        <SolarObject progress={progress} />
      </Canvas>
    </div>
  )
}
