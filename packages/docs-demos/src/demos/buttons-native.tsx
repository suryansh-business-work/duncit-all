import {
  BUTTON_SIZES,
  DISABLED_OPACITY,
  PRESS,
  PRESS_INTENTS,
  PRESS_RELEASE_MS,
  PRESS_STYLE,
  buttonSpec,
  pressStyle,
  pressThemeKeys,
  withAlpha,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
  type PressIntent,
} from '@duncit/buttons-native';
import { defineDemo, defineDemos } from '../types';

interface IntentMock {
  intent: PressIntent;
  disabled: boolean;
}

interface SpecMock {
  variant: ButtonVariant;
  tone: ButtonTone;
  size: ButtonSize;
  disabled: boolean;
  loading: boolean;
  full_width: boolean;
}

export default defineDemos('buttons-native', [
  defineDemo<IntentMock>({
    id: 'intents',
    title: 'What each intent does to a control while it is held',
    note: 'Switch `intent` between solid, control, ghost, surface, row and inline. `solid` is the only one that does not dim — a filled button darkens its own fill instead, because dimming a red button over a white page makes it lighter. Flip `disabled` and the press style disappears entirely: a control with nothing to do must not react to being held.',
    mock: { intent: 'control', disabled: false },
    compute: (mock) => {
      const recipe = PRESS[mock.intent];
      return {
        'PRESS[intent]': recipe,
        'pressStyle(intent, disabled) — what Tamagui gets': pressStyle(mock.intent, mock.disabled),
        'PRESS_STYLE[intent] — the frozen, shared object': PRESS_STYLE[mock.intent],
        'Dims to': recipe.opacity === 1 ? 'nothing (fill darkens instead)' : recipe.opacity,
        'Compresses to': recipe.scale === 1 ? 'nothing (a full-width row must not scale)' : recipe.scale,
        'Web state layer over the surface ink': recipe.tint === 0 ? 'none' : recipe.tint,
        'Every intent, in weight order': PRESS_INTENTS,
        'Release eases back over': `${PRESS_RELEASE_MS}ms (press-in is instant)`,
        'Disabled controls sit at': DISABLED_OPACITY,
      };
    },
  }),
  defineDemo<SpecMock>({
    id: 'spec',
    title: 'Everything a native button needs to paint itself',
    note: 'The colours are Tamagui theme token NAMES, never hex — the app resolves them from the same @duncit/auth-tokens palette mWeb builds its MUI theme from, so a third copy of the brand red cannot exist. Set loading and disabled independently: a loading button keeps its colour because it is still the thing you just pressed; only a disabled one recedes.',
    mock: {
      variant: 'solid',
      tone: 'primary',
      size: 'lg',
      disabled: false,
      loading: false,
      full_width: true,
    },
    compute: (mock) => {
      const spec = buttonSpec({
        variant: mock.variant,
        tone: mock.tone,
        size: mock.size,
        disabled: mock.disabled,
        loading: mock.loading,
        fullWidth: mock.full_width,
      });
      return {
        'buttonSpec(...)': spec,
        'Press intent it answers to': spec.intent,
        'Takes input': spec.interactive,
        'Sizes shared with mWeb': BUTTON_SIZES,
        'Tonal fills the palette does not carry': pressThemeKeys({
          primary: '#ff5757',
          primaryActive: '#d92d2d',
          danger: '#ef4444',
          success: '#22c55e',
        }),
        'withAlpha, the maths behind every state layer': withAlpha('#ff5757', PRESS.control.tint),
      };
    },
  }),
]);
