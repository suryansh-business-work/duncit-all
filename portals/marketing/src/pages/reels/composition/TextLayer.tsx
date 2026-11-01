import type { CSSProperties } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ReelTextPosition, ReelTextStyle } from '@duncit/gql-types';
import type { ReelCaptionStyle, ReelText } from '../types';
import { captionBlockStyle, highlightStyle, highlightedWordIndex } from './captions';
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
 * below (see SAFE_ZONE in aspect.ts).
 */

const TYPE: Record<ReelTextStyle, CSSProperties> = {
  TITLE: { fontSize: 92, fontWeight: 900, lineHeight: 1.08 },
  SUBTITLE: { fontSize: 60, fontWeight: 700, lineHeight: 1.15 },
  CAPTION: { fontSize: 46, fontWeight: 600, lineHeight: 1.25 },
};

const PLACE: Record<ReelTextPosition, CSSProperties> = {
  TOP: { justifyContent: 'flex-start', paddingTop: '15%' },
  CENTER: { justifyContent: 'center' },
  BOTTOM: { justifyContent: 'flex-end', paddingBottom: '20%' },
};

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface Props {
  text: ReelText;
  /** How long the words are on screen — what a HIGHLIGHT caption paces its words across. */
  frames: number;
  captions: ReelCaptionStyle;
  /** The brand's primary colour; empty for none. */
  accent: string;
}

/** A key per word that survives the same word appearing twice: the word and which occurrence it is. */
function keyedWords(words: readonly string[]): { word: string; key: string }[] {
  const seen = new Map<string, number>();
  return words.map((word) => {
    const occurrence = (seen.get(word) ?? 0) + 1;
    seen.set(word, occurrence);
    return { word, key: `${word}#${occurrence}` };
  });
}

/** The words, one span per word with the one being said emphasised. */
function HighlightedWords({ words, current, text, accent }: Readonly<{ words: string[]; current: number; text: ReelText; accent: string }>) {
  const emphasis = highlightStyle(text, accent);
  const keyed = keyedWords(words);
  return (
    <>
      {keyed.map(({ word, key }, index) => (
        <span key={key} style={index === current ? emphasis : undefined} data-testid={index === current ? 'reel-highlight' : undefined}>
          {word}
          {index < keyed.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

export function TextLayer({ text, frames, captions, accent }: Readonly<Props>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = text.animation === 'TYPEWRITER' ? typedText(text.text, frame) : text.text;
  const words = captions === 'HIGHLIGHT' ? shown.split(/\s+/).filter(Boolean) : [];

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingLeft: '8%', paddingRight: '8%', ...PLACE[text.position] }}>
      <div
        style={{
          ...TYPE[text.style],
          fontFamily: FONT_FAMILY,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          ...captionBlockStyle(captions, text, accent),
          ...entranceStyle(text.animation, frame, fps),
        }}
      >
        {captions === 'HIGHLIGHT' ? (
          <HighlightedWords words={words} current={highlightedWordIndex(words.length, frame, frames)} text={text} accent={accent} />
        ) : (
          shown
        )}
      </div>
    </AbsoluteFill>
  );
}
