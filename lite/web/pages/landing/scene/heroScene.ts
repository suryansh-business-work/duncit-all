import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  NormalBlending,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
} from 'three';

export interface HeroSceneOptions {
  /** Brand colours the shapes and sparks are painted in. */
  colors: readonly [string, string, string];
  dark: boolean;
  /** A phone: fewer sparks, a lower pixel ratio, no pointer parallax. */
  compact: boolean;
  /** False under reduced motion: one still frame, no loop, no parallax. */
  animate: boolean;
  /** The hero's scroll progress (0 at the top, 1 when it has scrolled away), read each frame. */
  scroll: () => number;
}

/**
 * Where each shape floats, toward the edges so the headline in the middle
 * stays clear and its contrast is untouched. Layout, not content.
 */
const SHAPES: readonly { make: () => BufferGeometry; x: number; y: number; z: number; color: 0 | 1 | 2; speed: number }[] = [
  { make: () => new TorusKnotGeometry(0.9, 0.28, 128, 16), x: -5.4, y: 2.3, z: -1, color: 0, speed: 0.22 },
  { make: () => new IcosahedronGeometry(1.05, 0), x: 5.6, y: 2.5, z: -2, color: 1, speed: 0.18 },
  { make: () => new TorusGeometry(0.85, 0.3, 24, 64), x: -4.8, y: -2.7, z: -1.5, color: 1, speed: 0.26 },
  { make: () => new SphereGeometry(0.75, 48, 48), x: 5, y: -2.3, z: 0, color: 0, speed: 0.2 },
  { make: () => new IcosahedronGeometry(0.5, 1), x: 0.6, y: 3.9, z: -3.5, color: 2, speed: 0.3 },
  { make: () => new TorusGeometry(0.45, 0.16, 16, 48), x: -1.4, y: -4.2, z: -2.5, color: 2, speed: 0.34 },
];

const SPREAD = { x: 18, y: 11, z: 9 } as const;

/** Everything that differs between a dark and a light page, or a phone and a desktop. */
function lookFor({ dark, compact }: HeroSceneOptions) {
  return {
    antialias: !compact,
    pixelRatio: compact ? 1.25 : 1.75,
    ambient: dark ? 0.55 : 1.1,
    key: dark ? 1.6 : 1.2,
    shapeOpacity: dark ? 0.9 : 0.8,
    sparks: compact ? 220 : 520,
    sparkSize: compact ? 0.06 : 0.05,
    sparkOpacity: dark ? 0.85 : 0.45,
    blending: dark ? AdditiveBlending : NormalBlending,
  };
}

function sparks(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // A fixed scatter (no Math.random), so every visit draws the same sky.
    positions[i * 3] = (((i * 73) % 1000) / 1000 - 0.5) * SPREAD.x;
    positions[i * 3 + 1] = (((i * 151) % 1000) / 1000 - 0.5) * SPREAD.y;
    positions[i * 3 + 2] = (((i * 37) % 1000) / 1000 - 0.75) * SPREAD.z;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * The hero's 3D backdrop: a few glossy brand-coloured shapes drifting at the
 * edges and a field of sparks. It renders into the canvas it is given, pauses
 * while the hero is off screen or the tab is hidden, and follows the pointer
 * and the scroll. Throws when the browser has no WebGL; the caller keeps the
 * flat background then. Returns the teardown.
 */
export function mountHeroScene(canvas: HTMLCanvasElement, options: HeroSceneOptions): () => void {
  const look = lookFor(options);
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: look.antialias, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, look.pixelRatio));
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new AmbientLight(0xffffff, look.ambient));
  const key = new DirectionalLight(0xffffff, look.key);
  key.position.set(4, 6, 8);
  scene.add(key);

  const palette = options.colors.map((hex) => new Color(hex));
  const meshes = SHAPES.map((shape) => {
    const material = new MeshStandardMaterial({ color: palette[shape.color], roughness: 0.28, metalness: 0.35, transparent: true, opacity: look.shapeOpacity });
    const mesh = new Mesh(shape.make(), material);
    mesh.position.set(shape.x, shape.y, shape.z);
    scene.add(mesh);
    return { mesh, shape };
  });
  const sky = new Points(
    sparks(look.sparks),
    new PointsMaterial({ color: palette[1], size: look.sparkSize, transparent: true, opacity: look.sparkOpacity, depthWrite: false, blending: look.blending }),
  );
  scene.add(sky);

  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  let onScreen = true;
  const started = performance.now();

  const draw = (now: number) => {
    const time = options.animate ? (now - started) / 1000 : 0;
    const scroll = options.animate ? options.scroll() : 0;
    for (const [index, { mesh, shape }] of meshes.entries()) {
      mesh.rotation.x = time * shape.speed + index;
      mesh.rotation.y = time * shape.speed * 1.3 + index * 0.5;
      // Bob gently, and rise faster than the page as it scrolls away, for depth.
      mesh.position.y = shape.y + Math.sin(time * 0.8 + index) * 0.25 + scroll * (2 + index * 0.4);
    }
    sky.rotation.y = time * 0.02 + scroll * 0.5;
    camera.position.x += (pointerX * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (-pointerY * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  const loop = (now: number) => {
    draw(now);
    frame = requestAnimationFrame(loop);
  };
  const running = () => frame !== 0;
  const play = () => {
    if (options.animate && onScreen && document.visibilityState === 'visible' && !running()) frame = requestAnimationFrame(loop);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    if (!running()) draw(performance.now());
  };
  const onPointer = (event: PointerEvent) => {
    pointerX = event.clientX / globalThis.innerWidth - 0.5;
    pointerY = event.clientY / globalThis.innerHeight - 0.5;
  };
  const onVisibility = () => (document.visibilityState === 'visible' ? play() : pause());

  const sizer = new ResizeObserver(resize);
  sizer.observe(canvas);
  const watcher = new IntersectionObserver(([entry]) => {
    onScreen = Boolean(entry?.isIntersecting);
    if (onScreen) play();
    else pause();
  });
  watcher.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  if (options.animate && !options.compact) globalThis.addEventListener('pointermove', onPointer, { passive: true });
  resize();
  play();

  return () => {
    pause();
    sizer.disconnect();
    watcher.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    globalThis.removeEventListener('pointermove', onPointer);
    for (const { mesh } of meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    sky.geometry.dispose();
    sky.material.dispose();
    renderer.dispose();
  };
}
