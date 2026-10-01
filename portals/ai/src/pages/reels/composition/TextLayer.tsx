import type { CSSProperties } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ReelText, ReelTextPosition, ReelTextStyle } from '@duncit/gql-types';
import { entranceStyle, typedText } from './motion';

/**
 * Words on a scene.
 *
 * Sizes are in the composition's own pixels (a 1080 × 1920 frame), not the
 * page's: the player scales the whole frame down to fit, so a title is the
 * same share of the reel at any preview size and in the exported file.
 *
 * The top and bottom insets keep text out of the bands a reel's own interface
 * covers once it is posted — the account name above, the caption and buttons
 * below.
 */

const TYPE: Record<ReelTextStyle, CSSProperties> = {
  TITLE: { fontSize: 92, fontWeight: 900, lineHeight: 1.08 },
  SUBTITLE: { fontSize: 60, fontWeight: 700, lineHeight: 1.15 },
  CAPTION: { fontSize: 46, fontWeight: 600, lineHeight: 1.25 },
};

const PLACE: Record<ReelTextPosition, CSSProperties> = {
  TOP: { justifyContent: 'flex-start', paddingTop: '12%' },
  CENTER: { justifyContent: 'center' },
  BOTTOM: { justifyContent: 'flex-end', paddingBottom: '20%' },
};

/** Without a pill behind them, words need an edge to stay readable over footage. */
const LEGIBILITY_SHADOW = '0 2px 12px rgba(0, 0, 0, 0.75)';

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function TextLayer({ text }: Readonly<{ text: ReelText }>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hasPill = text.background !== '';
  const shown = text.animation === 'TYPEWRITER' ? typedText(text.text, frame) : text.text;

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingLeft: '8%', paddingRight: '8%', ...PLACE[text.position] }}>
      <div
        style={{
          ...TYPE[text.style],
          fontFamily: FONT_FAMILY,
          color: text.color,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          backgroundColor: hasPill ? text.background : 'transparent',
          padding: hasPill ? '18px 34px' : 0,
          borderRadius: 26,
          textShadow: hasPill ? 'none' : LEGIBILITY_SHADOW,
          ...entranceStyle(text.animation, frame, fps),
        }}
      >
        {shown}
      </div>
    </AbsoluteFill>
  );
}
