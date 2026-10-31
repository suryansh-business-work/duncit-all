import { Dimensions } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import {
  flyerPose,
  occasionScene,
  particleCountFor,
  particlePose,
  type OccasionDecoration,
  type OccasionFlyer,
} from '@duncit/utils';

import { renderWithProviders } from '@/utils/test-utils';
import { OccasionEffects } from '../OccasionEffects';
import { burstSlotCount } from '../firework-worklets';
import { garlandGroups } from '../garland-groups';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
// The clock stands still at whatever instant a test picks.
let mockNow = 0;
jest.mock('../useOccasionClock', () => ({ useOccasionClock: jest.fn(() => ({ value: mockNow })) }));

const { width, height } = Dimensions.get('window');
const INSET_TOP = 47; // renderWithProviders' safe area

const santa: OccasionFlyer = {
  artwork: 'SANTA_SLEIGH',
  custom_layers: [],
  image_url: '',
  direction: 'LTR',
  altitude_min: 10,
  altitude_max: 20,
  size: 180,
  duration: 9,
  interval: 25,
  bob: 6,
  trail_color: '#FFD54F',
};

const christmas: OccasionDecoration = {
  particles: [
    {
      shapes: ['SNOWFLAKE', 'STAR'],
      custom_paths: [],
      colors: ['#FFFFFF'],
      motion: 'FALL',
      count: 40,
      size_min: 6,
      size_max: 16,
      speed: 60,
      opacity: 0.9,
    },
  ],
  flyers: [
    santa,
    {
      ...santa,
      artwork: 'IMAGE',
      image_url: 'https://cdn.duncit.com/occasions/lantern.png',
      trail_color: '',
    },
  ],
  fireworks: {
    enabled: true,
    colors: ['#FF5252', '#FFD740'],
    bursts_per_minute: 60,
    sparks: 20,
    radius: 100,
  },
  overlays: [
    { style: 'VIGNETTE', color: '#0B1A2E', opacity: 0.5 },
    { style: 'GLOW_TOP', color: '#FF8F00', opacity: 0.3 },
    { style: 'FOG', color: '#B0BEC5', opacity: 0.35 },
  ],
  garland: { style: 'STRING_LIGHTS', colors: [] },
};

const scene = occasionScene(christmas, width, height);

beforeEach(() => {
  jest.clearAllMocks();
  mockNow = 0;
});

describe('OccasionEffects', () => {
  it('draws every part of the look, hidden from screen readers and from every touch', () => {
    renderWithProviders(<OccasionEffects decoration={christmas} running />);

    const sky = screen.getByTestId('occasion-effects', { includeHiddenElements: true });
    expect(sky.props.pointerEvents).toBe('none');
    expect(sky.props.accessibilityElementsHidden).toBe(true);
    expect(sky.props.importantForAccessibility).toBe('no-hide-descendants');

    const all = (id: string) => screen.queryAllByTestId(id, { includeHiddenElements: true });
    expect(all('occasion-mark')).toHaveLength(particleCountFor(40, width));
    expect(all('occasion-flyer')).toHaveLength(2);
    // Only Santa leaves sparkles.
    expect(all('occasion-trail-dot')).toHaveLength(12);
    expect(all('occasion-flyer-image')).toHaveLength(1);
    expect(all('occasion-burst')).toHaveLength(burstSlotCount(christmas.fireworks));
    expect(all('occasion-glow')).toHaveLength(1);
    expect(all('occasion-band')).toHaveLength(1);
    expect(all('occasion-fog')).toHaveLength(3);
    expect(all('occasion-twinkle')).toHaveLength(garlandGroups(scene.garland).twinkles.length);
    expect(all('occasion-garland')[0]).toHaveStyle({ top: INSET_TOP, width });
  });

  it('poses each mark from the clock, where the engine puts it', () => {
    mockNow = 5.5;
    renderWithProviders(<OccasionEffects decoration={christmas} running />);
    const layer = scene.layers[0];
    const particle = layer?.particles[0];
    if (!layer || !particle) throw new Error('the look should lay out snow');
    const pose = particlePose(particle, 'FALL', 5.5, width, height, layer.opacity);

    const [mark] = screen.getAllByTestId('occasion-mark', { includeHiddenElements: true });
    expect(mark).toHaveStyle({
      opacity: expect.closeTo(pose.alpha, 6),
      width: particle.size,
      transform: [
        { translateX: expect.closeTo(pose.x, 6) },
        { translateY: expect.closeTo(pose.y, 6) },
        { rotate: `${particle.tilt + particle.spin * 5.5}rad` },
        { scaleX: expect.closeTo(pose.flip, 6) },
      ],
    });
  });

  it('keeps the flyers away until their first pass, then flies them along their path', () => {
    renderWithProviders(<OccasionEffects decoration={christmas} running />);
    const [sleigh] = screen.getAllByTestId('occasion-flyer', { includeHiddenElements: true });
    expect(sleigh).toHaveStyle({ opacity: 0 });

    mockNow = 4;
    screen.rerender(<OccasionEffects decoration={{ ...christmas }} running />);
    const pose = flyerPose(santa, 4, width, height, 0);
    if (!pose) throw new Error('Santa should be in the air at 4s');
    const [flying] = screen.getAllByTestId('occasion-flyer', { includeHiddenElements: true });
    expect(flying).toHaveStyle({
      opacity: 1,
      transform: [
        { translateX: expect.closeTo(pose.x, 6) },
        { translateY: expect.closeTo(pose.y, 6) },
        { rotate: `${pose.rotation}rad` },
        { scaleX: 1 },
      ],
    });
  });

  it('logs an uploaded flyer picture that will not load', () => {
    renderWithProviders(<OccasionEffects decoration={christmas} running={false} />);
    fireEvent(screen.getByTestId('occasion-flyer-image', { includeHiddenElements: true }), 'error');
    expect(logs.mobileApp.warn).toHaveBeenCalledWith('occasion', 'flyerImage', {
      url: 'https://cdn.duncit.com/occasions/lantern.png',
    });
  });

  it('draws only what the look asks for', () => {
    renderWithProviders(
      <OccasionEffects
        decoration={{
          ...christmas,
          flyers: [],
          overlays: [],
          fireworks: { ...christmas.fireworks, enabled: false },
          garland: { style: 'NONE', colors: [] },
        }}
        running
      />,
    );
    const none = (id: string) =>
      expect(screen.queryAllByTestId(id, { includeHiddenElements: true })).toHaveLength(0);
    [
      'occasion-flyer',
      'occasion-burst',
      'occasion-glow',
      'occasion-band',
      'occasion-fog',
      'occasion-garland',
    ].forEach(none);
    expect(
      screen.getAllByTestId('occasion-mark', { includeHiddenElements: true }).length,
    ).toBeGreaterThan(0);
  });
});
