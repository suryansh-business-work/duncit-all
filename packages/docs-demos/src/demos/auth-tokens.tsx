import { brand, dark, light, neutral, radii, semantic, typography } from '@duncit/auth-tokens';
import { defineDemo, defineDemos } from '../types';

interface SwatchMock {
  /** Which mode's palette to read: the app renders one of these two. */
  mode: 'light' | 'dark';
}

/** A colour, shown as a colour rather than as a hex string in a table. */
function Swatch({ name, value }: Readonly<{ name: string; value: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 190 }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: value,
          border: '1px solid rgba(128,128,128,0.35)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {name} <span style={{ opacity: 0.65 }}>{value}</span>
      </span>
    </div>
  );
}

export default defineDemos('auth-tokens', [
  defineDemo<SwatchMock>({
    id: 'palette',
    title: 'The raw design tokens, before any framework touches them',
    note:
      "Switch mode to 'dark'. These are plain values with no MUI and no Tamagui in sight — which is why the native app and the portals can both be built from them.",
    mock: { mode: 'light' },
    render: (mock) => {
      const mode = mock.mode === 'dark' ? dark : light;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {Object.entries(mode).map(([name, value]) => (
            <Swatch key={name} name={name} value={String(value)} />
          ))}
        </div>
      );
    },
    compute: (mock) => ({
      'Brand scale': brand,
      'Neutral scale': neutral,
      'Semantic colours': semantic,
      'Mode read': mock.mode,
      'Radii': radii,
      'Typography': typography,
    }),
  }),
]);
