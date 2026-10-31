import { builtin, fireworks, flyer, garland, overlay, swarm } from './occasion.catalogue.build';

/** Saffron, white and India green. */
const TRICOLOUR = ['#FF9933', '#FFFFFF', '#138808'];
const PLAYFUL = ['#EF5350', '#FFCA28', '#42A5F5', '#66BB6A', '#AB47BC'];
const PARTY = ['#F5C84A', '#FF4FA3', '#3EC1F3', '#7ED957', '#9B5DE5'];
const PASTEL = ['#F8BBD0', '#B3E5FC', '#C8E6C9', '#FFF9C4', '#E1BEE7'];

/** India's national days. */
export const NATIONAL_LOOKS = [
  builtin('independence-day', {
    name: 'Independence Day',
    description: 'The tricolour: confetti in saffron, white and green, kites drifting across, tricolour bunting.',
    region: 'NATIONAL',
    greeting: 'Happy Independence Day! Jai Hind.',
    particles: [
      swarm(['CONFETTI'], 'FALL', TRICOLOUR, { count: 50, size_min: 6, size_max: 12, speed: 70 }),
      swarm(['KITE'], 'DRIFT', TRICOLOUR, { count: 8, size_min: 18, size_max: 28, speed: 50 }),
    ],
    flyers: [flyer('KITE', { altitude_min: 10, altitude_max: 28, size: 100, duration: 16, interval: 26, bob: 14 })],
    garland: garland('BUNTING', TRICOLOUR),
  }),
  builtin('republic-day', {
    name: 'Republic Day',
    description: 'Navy and tricolour: confetti falls, the Ashoka Chakra glows, tricolour bunting.',
    region: 'NATIONAL',
    greeting: 'Happy Republic Day!',
    particles: [
      swarm(['CONFETTI'], 'FALL', TRICOLOUR, { count: 40, size_min: 6, size_max: 12, speed: 66 }),
      swarm(['CHAKRA'], 'TWINKLE', ['#1A237E'], { count: 6, size_min: 20, size_max: 32, speed: 30, opacity: 0.5 }),
    ],
    garland: garland('BUNTING', TRICOLOUR),
  }),
  builtin('gandhi-jayanti', {
    name: 'Gandhi Jayanti',
    description: 'Quiet khadi tones: a few pale leaves drift down.',
    region: 'NATIONAL',
    greeting: 'Remembering Bapu on Gandhi Jayanti.',
    particles: [swarm(['LEAF'], 'FALL', ['#A5D6A7', '#C5E1A5', '#E6EE9C'], { count: 14, size_min: 10, size_max: 16, speed: 28, opacity: 0.7 })],
  }),
  builtin('childrens-day', {
    name: "Children's Day",
    description: 'Primary colours: balloons float up, confetti and stars fall, a hot-air balloon sails past.',
    region: 'NATIONAL',
    greeting: "Happy Children's Day!",
    particles: [
      swarm(['BALLOON'], 'RISE', PLAYFUL, { count: 16, size_min: 18, size_max: 30, speed: 38 }),
      swarm(['CONFETTI', 'STAR'], 'FALL', PLAYFUL, { count: 30, size_min: 5, size_max: 11, speed: 60 }),
    ],
    flyers: [flyer('HOT_AIR_BALLOON', { altitude_min: 12, altitude_max: 30, size: 90, duration: 20, interval: 34, bob: 10 })],
    garland: garland('BUNTING', PLAYFUL),
  }),
];

/** Days the world celebrates. */
export const WORLD_LOOKS = [
  builtin('christmas', {
    name: 'Christmas',
    description: 'Pine green and berry red: snow falls in layers, Santa and his reindeer fly across, fairy lights hang above.',
    region: 'WESTERN',
    greeting: 'Merry Christmas from Duncit!',
    particles: [
      // Half white, half ice blue: white reads over photos and the header, blue over white cards.
      swarm(['SNOWFLAKE'], 'FALL', ['#FFFFFF', '#CFE6FA', '#9CC9F0'], { count: 60, size_min: 7, size_max: 18, speed: 42, opacity: 0.95 }),
      swarm(['CIRCLE'], 'FALL', ['#FFFFFF', '#BBDEFB'], { count: 50, size_min: 2, size_max: 5, speed: 30, opacity: 0.85 }),
    ],
    flyers: [flyer('SANTA_SLEIGH', { altitude_min: 7, altitude_max: 18, size: 230, duration: 13, interval: 28, bob: 9, trail_color: '#FFD54F' })],
    overlays: [overlay('GLOW_TOP', '#BFE3FF', 0.12)],
    garland: garland('STRING_LIGHTS', ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF']),
  }),
  builtin('halloween', {
    name: 'Halloween',
    description: 'A spooky night, always dark: bats swoop, ghosts fade in and out, a witch flies past, fog creeps in, webs in the corners.',
    region: 'WESTERN',
    color_mode: 'DARK',
    greeting: 'Happy Halloween! Something spooky this way comes.',
    particles: [
      swarm(['BAT'], 'DRIFT', ['#7A4FB0', '#5E3A8C', '#3D2A5C'], { count: 16, size_min: 18, size_max: 36, speed: 85, opacity: 0.95 }),
      swarm(['GHOST'], 'TWINKLE', ['#EDE7F6'], { count: 7, size_min: 22, size_max: 40, speed: 40, opacity: 0.3 }),
      swarm(['PUMPKIN'], 'TWINKLE', ['#FF7518'], { count: 4, size_min: 16, size_max: 24, speed: 35, opacity: 0.55 }),
    ],
    flyers: [flyer('WITCH_BROOM', { direction: 'RTL', altitude_min: 8, altitude_max: 22, size: 150, duration: 11, interval: 24, bob: 12, trail_color: '#B57BFF' })],
    overlays: [overlay('VIGNETTE', '#000000', 0.6), overlay('FOG', '#9C8CC4', 0.14)],
    garland: garland('SPIDER_WEB', ['#CFC6E0']),
  }),
  builtin('new-year', {
    name: 'New Year',
    description: 'Midnight indigo and gold: fireworks fill the sky, confetti and stars fall, golden lights hang above.',
    region: 'GLOBAL',
    greeting: "Happy New Year! Here's to new plans together.",
    particles: [swarm(['CONFETTI', 'STAR'], 'FALL', PARTY, { count: 46, size_min: 6, size_max: 12, speed: 70 })],
    fireworks: fireworks([...PARTY.slice(0, 4), '#FFFFFF'], { bursts_per_minute: 18, sparks: 34, radius: 100 }),
    garland: garland('STRING_LIGHTS', ['#F5C84A', '#FFFFFF', '#C9A8FF']),
  }),
  builtin('valentines-day', {
    name: "Valentine's Day",
    description: 'Rose red: hearts float up, petals fall, a soft pink glow and heart-toned bunting.',
    region: 'WESTERN',
    greeting: "Happy Valentine's Day!",
    particles: [
      swarm(['HEART'], 'RISE', ['#FF4D6D', '#FF8FA3', '#E02454', '#FFB3C1'], { count: 30, size_min: 10, size_max: 22, speed: 30 }),
      swarm(['PETAL'], 'FALL', ['#E02454', '#FF8FA3'], { count: 14, size_min: 8, size_max: 14, speed: 34, opacity: 0.8 }),
    ],
    overlays: [overlay('GLOW_TOP', '#FF8FA3', 0.14)],
    garland: garland('BUNTING', ['#FF4D6D', '#FFFFFF', '#FFB3C1']),
  }),
  builtin('easter', {
    name: 'Easter',
    description: 'Spring pastels: painted eggs and blossom tumble down under pastel bunting.',
    region: 'WESTERN',
    greeting: 'Happy Easter!',
    particles: [
      swarm(['EGG'], 'FALL', PASTEL, { count: 22, size_min: 12, size_max: 20, speed: 34 }),
      swarm(['PETAL'], 'FALL', ['#FFFFFF', '#F8BBD0'], { count: 14, size_min: 6, size_max: 12, speed: 30, opacity: 0.8 }),
    ],
    garland: garland('BUNTING', PASTEL),
  }),
  builtin('thanksgiving', {
    name: 'Thanksgiving',
    description: 'Autumn rust and amber: maple-toned leaves tumble down under harvest bunting.',
    region: 'WESTERN',
    greeting: 'Happy Thanksgiving! Grateful for you.',
    particles: [swarm(['LEAF'], 'FALL', ['#E65100', '#BF360C', '#F9A825', '#8D6E63', '#D84315'], { count: 34, size_min: 10, size_max: 20, speed: 40 })],
    garland: garland('BUNTING', ['#BF360C', '#F9A825', '#6D4C41']),
  }),
  builtin('friendship-day', {
    name: 'Friendship Day',
    description: 'Sunny and bright: balloons rise, hearts and stars twinkle, a hot-air balloon sails past.',
    region: 'GLOBAL',
    greeting: 'Happy Friendship Day! Bring a friend along.',
    particles: [
      swarm(['BALLOON'], 'RISE', ['#FFCA28', '#42A5F5', '#EF5350', '#66BB6A'], { count: 14, size_min: 18, size_max: 28, speed: 36 }),
      swarm(['HEART', 'STAR'], 'TWINKLE', ['#FFCA28', '#F48FB1'], { count: 16, size_min: 6, size_max: 12, speed: 60 }),
    ],
    flyers: [flyer('HOT_AIR_BALLOON', { altitude_min: 12, altitude_max: 30, size: 90, duration: 20, interval: 34, bob: 10 })],
    garland: garland('BUNTING', PLAYFUL),
  }),
  builtin('mothers-day', {
    name: "Mother's Day",
    description: 'Rose and lilac: petals fall, hearts float up, a soft blush glow.',
    region: 'GLOBAL',
    greeting: "Happy Mother's Day!",
    particles: [
      swarm(['PETAL'], 'FALL', ['#F48FB1', '#F8BBD0', '#CE93D8'], { count: 26, size_min: 8, size_max: 15, speed: 32 }),
      swarm(['HEART'], 'RISE', ['#EC407A', '#F48FB1'], { count: 12, size_min: 10, size_max: 18, speed: 26 }),
    ],
    overlays: [overlay('GLOW_TOP', '#F8BBD0', 0.14)],
  }),
  builtin('fathers-day', {
    name: "Father's Day",
    description: 'Deep blue: stars twinkle and balloons rise.',
    region: 'GLOBAL',
    greeting: "Happy Father's Day!",
    particles: [
      swarm(['STAR'], 'TWINKLE', ['#90CAF9', '#FFD54F'], { count: 22, size_min: 5, size_max: 12, speed: 60 }),
      swarm(['BALLOON'], 'RISE', ['#1E88E5', '#42A5F5', '#FFCA28'], { count: 10, size_min: 16, size_max: 26, speed: 34 }),
    ],
  }),
  builtin('womens-day', {
    name: "Women's Day",
    description: 'Purple and rose: petals fall and sparks twinkle.',
    region: 'GLOBAL',
    greeting: "Happy Women's Day!",
    particles: [
      swarm(['PETAL'], 'FALL', ['#AB47BC', '#CE93D8', '#F48FB1'], { count: 26, size_min: 8, size_max: 15, speed: 32 }),
      swarm(['SPARK'], 'TWINKLE', ['#E1BEE7', '#FFD54F'], { count: 16, size_min: 4, size_max: 9, speed: 70 }),
    ],
  }),
  builtin('earth-day', {
    name: 'Earth Day',
    description: 'Forest green and sky blue: green leaves drift down in a fresh glow.',
    region: 'GLOBAL',
    greeting: "Happy Earth Day! Let's go outside together.",
    particles: [swarm(['LEAF'], 'FALL', ['#43A047', '#66BB6A', '#2E7D32', '#9CCC65'], { count: 26, size_min: 10, size_max: 18, speed: 32 })],
    overlays: [overlay('GLOW_TOP', '#A5D6A7', 0.12)],
  }),
  builtin('yoga-day', {
    name: 'International Yoga Day',
    description: 'Calm teal: a gentle sun glows and leaves float by.',
    region: 'GLOBAL',
    greeting: 'Happy International Yoga Day!',
    particles: [
      swarm(['SUN'], 'TWINKLE', ['#FFB74D'], { count: 4, size_min: 26, size_max: 40, speed: 22, opacity: 0.5 }),
      swarm(['LEAF'], 'DRIFT', ['#4DB6AC', '#81C784'], { count: 12, size_min: 10, size_max: 16, speed: 30, opacity: 0.8 }),
    ],
  }),
];
