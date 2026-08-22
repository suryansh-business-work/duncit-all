import { CARD_MAX_WIDTH, MIN_HEIGHT, dialogMetrics, keyboardLift } from '@duncit/dialogs-native';
import { defineDemo, defineDemos } from '../types';

interface DeviceMock {
  variant: 'center' | 'sheet';
  window_height: number;
  window_width: number;
  top_inset: number;
  keyboard_height: number;
  bottom_inset: number;
  max_height_ratio: number;
}

export default defineDemos('dialogs-native', [
  defineDemo<DeviceMock>({
    id: 'metrics',
    title: 'How tall a native dialog is allowed to be',
    note:
      "Raise keyboard_height to 336 — a sheet loses only that, a centred card also has to clear the notch twice. Switch variant to see it. The package is pure arithmetic; the Tamagui view lives in the app.",
    mock: {
      variant: 'sheet',
      window_height: 844,
      window_width: 390,
      top_inset: 47,
      keyboard_height: 0,
      bottom_inset: 34,
      max_height_ratio: 0.9,
    },
    compute: (mock) => {
      const lift = keyboardLift(mock.keyboard_height, mock.bottom_inset);
      const metrics = dialogMetrics({
        variant: mock.variant,
        windowHeight: mock.window_height,
        windowWidth: mock.window_width,
        topInset: mock.top_inset,
        keyboardInset: lift,
        maxHeightRatio: mock.max_height_ratio,
      });
      return {
        'keyboardLift(...)': lift,
        'maxHeight': metrics.maxHeight,
        'bottomLift': metrics.bottomLift,
        'cardWidth / cardMaxWidth': `${metrics.cardWidth} / ${metrics.cardMaxWidth}`,
        'Floor it will never go below': MIN_HEIGHT,
        'Centred card cap': CARD_MAX_WIDTH,
      };
    },
  }),
]);
