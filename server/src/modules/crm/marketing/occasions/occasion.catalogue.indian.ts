import { builtin, fireworks, flyer, garland, overlay, swarm } from './occasion.catalogue.build';

const GOLD = ['#FFD54F', '#FFE082', '#FFB300'];
const MARIGOLD = ['#FF8F00', '#FFC107'];
const GULAL = ['#FF4FA3', '#FFD60A', '#3EC1F3', '#7ED957', '#9B5DE5', '#FF7A00'];
/** The nine colours of Navratri, one per night. */
const NAVRATRI_NINE = ['#FF9800', '#FFFFFF', '#E53935', '#1E88E5', '#FDD835', '#43A047', '#9E9E9E', '#EC407A', '#7B1FA2'];
const KITES = ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00'];

/** India's big festivals. */
export const INDIAN_LOOKS = [
  builtin('diwali', {
    name: 'Diwali',
    description: 'Maroon and gold: diyas and lanterns float up, gold sparks twinkle, fireworks burst overhead under a marigold toran.',
    region: 'INDIAN',
    greeting: 'Happy Diwali! May every lamp light up a new friendship.',
    particles: [
      swarm(['SPARK', 'STAR'], 'TWINKLE', GOLD, { count: 46, size_min: 4, size_max: 11, speed: 70, opacity: 0.95 }),
      swarm(['DIYA'], 'RISE', ['#FFB300', '#FF8F00', '#FFCA28'], { count: 12, size_min: 14, size_max: 26, speed: 24 }),
      swarm(['LANTERN'], 'RISE', ['#FF7043', '#FFA726'], { count: 6, size_min: 16, size_max: 28, speed: 18, opacity: 0.8 }),
    ],
    fireworks: fireworks(['#FFD54F', '#FF8A00', '#FF4081', '#FFF59D', '#69F0AE'], { bursts_per_minute: 14, sparks: 32, radius: 95 }),
    overlays: [overlay('GLOW_TOP', '#FFB300', 0.14)],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('holi', {
    name: 'Holi',
    description: 'Magenta and violet with clouds of gulal drifting across, colour bursting like thrown powder.',
    region: 'INDIAN',
    greeting: 'Happy Holi! Play safe, play bright.',
    particles: [
      swarm(['CIRCLE', 'DROP'], 'DRIFT', GULAL, { count: 40, size_min: 8, size_max: 20, speed: 70, opacity: 0.7 }),
      swarm(['CIRCLE'], 'FALL', GULAL, { count: 30, size_min: 3, size_max: 7, speed: 50, opacity: 0.8 }),
    ],
    fireworks: fireworks(GULAL, { bursts_per_minute: 10, sparks: 40, radius: 120 }),
    garland: garland('BUNTING', GULAL),
  }),
  builtin('dussehra', {
    name: 'Dussehra',
    description: 'Saffron and deep red: sparks and flames rise as if from the burning effigy, fireworks above.',
    region: 'INDIAN',
    greeting: 'Happy Dussehra! May good always win.',
    particles: [
      swarm(['SPARK'], 'RISE', ['#F5C84A', '#FFB300', '#FFE082'], { count: 34, size_min: 5, size_max: 12, speed: 50 }),
      swarm(['FLAME'], 'RISE', ['#FF7043', '#FFA726'], { count: 10, size_min: 12, size_max: 22, speed: 30, opacity: 0.75 }),
    ],
    fireworks: fireworks(['#FFD54F', '#FF6F00', '#FFF59D'], { bursts_per_minute: 10 }),
    overlays: [overlay('GLOW_TOP', '#FF8F00', 0.12)],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('navratri', {
    name: 'Navratri',
    description: 'Petals in the nine colours of the nine nights, gold sparks, a marigold toran for garba.',
    region: 'INDIAN',
    greeting: 'Shubh Navratri! Nine nights of garba and joy.',
    particles: [
      swarm(['PETAL'], 'FALL', NAVRATRI_NINE, { count: 34, size_min: 8, size_max: 16, speed: 36 }),
      swarm(['SPARK'], 'TWINKLE', ['#FFD54F'], { count: 20, size_min: 4, size_max: 9, speed: 80 }),
    ],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('durga-puja', {
    name: 'Durga Puja',
    description: 'Sindoor red: shiuli flowers drift down, sparks twinkle, a red-and-gold toran hangs above.',
    region: 'INDIAN',
    greeting: 'Shubho Durga Puja!',
    particles: [
      swarm(['PETAL'], 'FALL', ['#FFFFFF', '#FF7043', '#FFE0B2'], { count: 30, size_min: 7, size_max: 14, speed: 32 }),
      swarm(['SPARK'], 'TWINKLE', ['#FFD54F', '#FF8A65'], { count: 18, size_min: 4, size_max: 9, speed: 70 }),
    ],
    overlays: [overlay('GLOW_TOP', '#E11D48', 0.1)],
    garland: garland('MARIGOLD', ['#E53935', '#FFC107']),
  }),
  builtin('ganesh-chaturthi', {
    name: 'Ganesh Chaturthi',
    description: 'Saffron: modaks and marigolds shower down under a toran for Bappa.',
    region: 'INDIAN',
    greeting: 'Ganpati Bappa Morya!',
    particles: [
      swarm(['MODAK'], 'FALL', ['#FFF3E0', '#FFE0B2', '#FFCC80'], { count: 16, size_min: 14, size_max: 24, speed: 34 }),
      swarm(['MARIGOLD'], 'FALL', MARIGOLD, { count: 22, size_min: 10, size_max: 18, speed: 40 }),
    ],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('janmashtami', {
    name: 'Janmashtami',
    description: 'Peacock blue and teal: peacock feathers drift across a starry sky.',
    region: 'INDIAN',
    greeting: 'Happy Janmashtami! Jai Shri Krishna.',
    particles: [
      swarm(['FEATHER'], 'DRIFT', ['#0E7C86', '#1565C0', '#2E7D32', '#00897B'], { count: 14, size_min: 18, size_max: 30, speed: 40, opacity: 0.85 }),
      swarm(['STAR'], 'TWINKLE', ['#FFD54F', '#B3E5FC'], { count: 22, size_min: 4, size_max: 9, speed: 70 }),
    ],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('makar-sankranti', {
    name: 'Makar Sankranti',
    description: 'Clear-sky blue: kites of every colour sail across, a big patang loops through now and then.',
    region: 'INDIAN',
    greeting: 'Happy Makar Sankranti! Let your kites soar.',
    particles: [swarm(['KITE'], 'DRIFT', KITES, { count: 16, size_min: 16, size_max: 30, speed: 55, opacity: 0.95 })],
    flyers: [flyer('KITE', { altitude_min: 8, altitude_max: 26, size: 110, duration: 16, interval: 24, bob: 16 })],
    overlays: [overlay('GLOW_TOP', '#FFD54F', 0.12)],
  }),
  builtin('lohri', {
    name: 'Lohri',
    description: 'Bonfire red: flames and sparks rise into a warm glow.',
    region: 'INDIAN',
    greeting: 'Happy Lohri! Warm wishes by the bonfire.',
    particles: [
      swarm(['FLAME'], 'RISE', ['#FF7043', '#FFA726', '#FFCA28'], { count: 18, size_min: 12, size_max: 24, speed: 34, opacity: 0.85 }),
      swarm(['SPARK'], 'RISE', ['#FFD54F', '#FFAB40'], { count: 30, size_min: 3, size_max: 8, speed: 60 }),
    ],
    overlays: [overlay('GLOW_TOP', '#FF6F00', 0.14)],
  }),
  builtin('pongal', {
    name: 'Pongal',
    description: 'Turmeric and sugarcane green: a warm sun glows while harvest leaves fall.',
    region: 'INDIAN',
    greeting: 'Happy Pongal! May the harvest bring joy.',
    particles: [
      swarm(['SUN'], 'TWINKLE', ['#FBC02D', '#FFB300'], { count: 8, size_min: 16, size_max: 28, speed: 30, opacity: 0.7 }),
      swarm(['LEAF'], 'FALL', ['#43A047', '#7CB342', '#C0CA33'], { count: 22, size_min: 10, size_max: 18, speed: 36 }),
    ],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('onam', {
    name: 'Onam',
    description: 'A pookalam come to life: petals and marigolds in pookalam colours drift down.',
    region: 'INDIAN',
    greeting: 'Happy Onam! A pookalam of good times.',
    particles: [swarm(['PETAL', 'MARIGOLD'], 'FALL', ['#FFC107', '#FF9800', '#FFFFFF', '#E53935', '#8E24AA'], { count: 32, size_min: 8, size_max: 16, speed: 34 })],
    garland: garland('MARIGOLD', MARIGOLD),
  }),
  builtin('raksha-bandhan', {
    name: 'Raksha Bandhan',
    description: 'Rose and gold: rakhi rings glimmer while petals and sparks fall.',
    region: 'INDIAN',
    greeting: 'Happy Raksha Bandhan!',
    particles: [
      swarm(['RING'], 'TWINKLE', ['#F59E0B', '#EC407A'], { count: 10, size_min: 14, size_max: 22, speed: 40, opacity: 0.7 }),
      swarm(['PETAL', 'SPARK'], 'FALL', ['#F48FB1', '#FFD54F', '#FFFFFF'], { count: 26, size_min: 6, size_max: 13, speed: 34 }),
    ],
    garland: garland('BUNTING', ['#EC407A', '#FFD54F', '#FFFFFF']),
  }),
  builtin('karwa-chauth', {
    name: 'Karwa Chauth',
    description: 'A moonlit night: the moon and stars glow, a shooting star crosses the sky.',
    region: 'INDIAN',
    greeting: 'Happy Karwa Chauth!',
    particles: [
      swarm(['MOON'], 'TWINKLE', ['#FFE082'], { count: 3, size_min: 30, size_max: 46, speed: 25, opacity: 0.8 }),
      swarm(['STAR', 'SPARK'], 'TWINKLE', ['#FFF8E1', '#FFD54F'], { count: 40, size_min: 3, size_max: 9, speed: 60 }),
    ],
    flyers: [flyer('SHOOTING_STAR', { direction: 'RTL', altitude_min: 6, altitude_max: 20, size: 30, duration: 3.5, interval: 14, bob: 0, trail_color: '#FFE082' })],
    overlays: [overlay('VIGNETTE', '#0B1030', 0.3)],
  }),
  builtin('baisakhi', {
    name: 'Baisakhi',
    description: 'Ripe-wheat gold: golden leaves fall, sparks twinkle, bright bunting for the bhangra.',
    region: 'INDIAN',
    greeting: 'Happy Baisakhi! Balle balle!',
    particles: [
      swarm(['LEAF'], 'FALL', ['#FBC02D', '#F9A825', '#7CB342'], { count: 24, size_min: 10, size_max: 18, speed: 38 }),
      swarm(['SPARK'], 'TWINKLE', ['#FFD54F'], { count: 16, size_min: 4, size_max: 9, speed: 70 }),
    ],
    garland: garland('BUNTING', ['#FBC02D', '#1D4ED8', '#FB8C00']),
  }),
  builtin('guru-nanak-jayanti', {
    name: 'Guru Nanak Jayanti',
    description: 'Saffron and blue: diyas rise in a warm glow under strings of golden lights.',
    region: 'INDIAN',
    greeting: 'Happy Gurpurab!',
    particles: [
      swarm(['DIYA'], 'RISE', ['#FFB300', '#FFCA28'], { count: 12, size_min: 14, size_max: 24, speed: 22 }),
      swarm(['SPARK'], 'TWINKLE', ['#FFE082', '#FFD54F'], { count: 28, size_min: 4, size_max: 9, speed: 70 }),
    ],
    overlays: [overlay('GLOW_TOP', '#FFB300', 0.12)],
    garland: garland('STRING_LIGHTS', ['#FFD54F', '#FFB300', '#FFF8E1']),
  }),
  builtin('eid', {
    name: 'Eid',
    description: 'Teal and gold: crescent moons and stars twinkle, lanterns rise, golden lights hang above.',
    region: 'INDIAN',
    greeting: 'Eid Mubarak! Wishing you peace and plenty.',
    particles: [
      swarm(['MOON', 'STAR'], 'TWINKLE', ['#FFD98A', '#FFF8E1'], { count: 26, size_min: 6, size_max: 16, speed: 50 }),
      swarm(['LANTERN'], 'RISE', ['#FFB74D', '#4DB6AC'], { count: 8, size_min: 16, size_max: 28, speed: 20, opacity: 0.85 }),
    ],
    flyers: [flyer('SHOOTING_STAR', { altitude_min: 5, altitude_max: 18, size: 28, duration: 3.5, interval: 16, bob: 0, trail_color: '#FFD98A' })],
    garland: garland('STRING_LIGHTS', ['#FFD54F', '#80CBC4', '#FFF8E1']),
  }),
  builtin('chhath-puja', {
    name: 'Chhath Puja',
    description: 'Sunrise orange over water: diyas float up, the sun glows, water drops shimmer.',
    region: 'INDIAN',
    greeting: 'Happy Chhath Puja!',
    particles: [
      swarm(['DIYA'], 'RISE', ['#FFB300', '#FF8F00'], { count: 12, size_min: 14, size_max: 24, speed: 20 }),
      swarm(['SUN'], 'TWINKLE', ['#FFB300'], { count: 4, size_min: 26, size_max: 40, speed: 25, opacity: 0.55 }),
      swarm(['DROP'], 'FALL', ['#4FC3F7', '#81D4FA'], { count: 14, size_min: 6, size_max: 10, speed: 50, opacity: 0.6 }),
    ],
    overlays: [overlay('GLOW_TOP', '#FF8F00', 0.14)],
  }),
];
