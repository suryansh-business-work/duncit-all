import { Dimensions } from 'react-native';
import { screen } from '@testing-library/react-native';
import {
  occasionFrame,
  occasionScene,
  twinkleAlpha,
  type OccasionDecoration,
  type OccasionOverlay,
  type RadialOp,
} from '@duncit/utils';

import { renderWithProviders } from '@/utils/test-utils';
import { OccasionEffects } from '../OccasionEffects';
import { BURST_MARGIN, burstPaint, burstSlotCount } from '../firework-worklets';
import { garlandGroups } from '../garland-groups';

// The clock stands still at whatever instant a test picks.
let mockNow = 0;
jest.mock('../useOccasionClock', () => ({ useOccasionClock: jest.fn(() => ({ value: mockNow })) }));

const { width, height } = Dimensions.get('window');
const T = 3.5;

const fog: OccasionOverlay = { style: 'FOG', color: '#B0BEC5', opacity: 0.35 };
const night: OccasionDecoration = {
  particles: [],
  flyers: [],
  fireworks: {
    enabled: true,
    colors: ['#FF5252', '#FFD740'],
    bursts_per_minute: 60,
    sparks: 20,
    radius: 100,
  },
  overlays: [fog],
  garland: { style: 'STRING_LIGHTS', colors: [] },
};
const scene = occasionScene(night, width, height);
const all = (id: string) => screen.queryAllByTestId(id, { includeHiddenElements: true });

beforeEach(() => {
  mockNow = T;
});

describe('OccasionEffects — the sky over the screen', () => {
  it('drifts each fog bank along the bottom, where the engine draws it', () => {
    renderWithProviders(<OccasionEffects decoration={night} running />);
    const banks = occasionFrame({ ...scene, layers: [], garland: [] }, T).filter(
      (op): op is RadialOp => op.op === 'radial',
    );
    const views = all('occasion-fog');
    expect(views).toHaveLength(3);
    views.forEach((view, bank) => {
      const op = banks[bank];
      if (!op) throw new Error(`the engine should draw fog bank ${bank}`);
      expect(view).toHaveStyle({
        top: op.y - op.radius,
        width: op.radius * 2,
        transform: [{ translateX: expect.closeTo(op.x - op.radius, 6) }],
      });
    });
  });

  it('pulses the string-light bulbs group by group, as the engine pulses each bulb', () => {
    renderWithProviders(<OccasionEffects decoration={night} running />);
    const groups = garlandGroups(scene.garland).twinkles;
    const sheets = all('occasion-twinkle');
    expect(sheets).toHaveLength(groups.length);
    sheets.forEach((sheet, n) => {
      expect(sheet).toHaveStyle({
        opacity: expect.closeTo(twinkleAlpha(groups[n]?.phase ?? Number.NaN, T), 9),
      });
    });
  });

  it('centres each burst slot on the burst it has alight', () => {
    renderWithProviders(<OccasionEffects decoration={night} running />);
    const slots = burstSlotCount(night.fireworks);
    const half = night.fireworks.radius + BURST_MARGIN;
    const views = all('occasion-burst');
    expect(views).toHaveLength(slots);
    views.forEach((view, slot) => {
      const paint = burstPaint(night.fireworks, slot, slots, T, { width, height }, half);
      expect(view).toHaveStyle({
        width: half * 2,
        transform: [{ translateX: paint.x - half }, { translateY: paint.y - half }],
      });
    });
  });

  it('hangs a garland that never twinkles as one still sheet', () => {
    const bunting = { style: 'BUNTING' as const, colors: ['#FF9933', '#FFFFFF', '#138808'] };
    renderWithProviders(<OccasionEffects decoration={{ ...night, garland: bunting }} running />);
    expect(all('occasion-garland')).toHaveLength(1);
    expect(all('occasion-twinkle')).toHaveLength(0);
  });
});
