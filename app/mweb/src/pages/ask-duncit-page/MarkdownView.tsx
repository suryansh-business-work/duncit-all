import { Fragment } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { parseAnswerMarkdown, type MdSpan } from '@duncit/utils';

/**
 * An answer, drawn from the shared Markdown parse (@duncit/utils) — the same
 * structure the native app draws. No HTML is ever injected; links are only
 * http(s) and open in a new tab.
 */
function Spans({ spans }: Readonly<{ spans: MdSpan[] }>) {
  return (
    <>
      {spans.map((span, index) => {
        const key = `${index}-${span.text.slice(0, 8)}`;
        if (span.href) {
          return (
            <Link key={key} href={span.href} target="_blank" rel="noopener noreferrer" underline="always">
              {span.text}
            </Link>
          );
        }
        if (span.code) {
          return (
            <Box key={key} component="code" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
              {span.text}
            </Box>
          );
        }
        return (
          <Box key={key} component="span" sx={{ fontWeight: span.bold ? 700 : undefined, fontStyle: span.italic ? 'italic' : undefined }}>
            {span.text}
          </Box>
        );
      })}
    </>
  );
}

const HEADING_VARIANT = { 1: 'h6', 2: 'subtitle1', 3: 'subtitle2' } as const;

export default function MarkdownView({ text }: Readonly<{ text: string }>) {
  const blocks = parseAnswerMarkdown(text);
  return (
    <Box sx={{ '& > * + *': { mt: 1 } }}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          return (
            <Typography key={key} variant={HEADING_VARIANT[block.level]} component="p" sx={{ fontWeight: 700 }}>
              <Spans spans={block.spans} />
            </Typography>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <Typography key={key} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <Spans spans={block.spans} />
            </Typography>
          );
        }
        const ordered = block.type === 'numbered';
        return (
          <Box key={key} component={ordered ? 'ol' : 'ul'} start={ordered ? block.start : undefined} sx={{ m: 0, pl: 2.5 }}>
            {block.items.map((item, i) => (
              <Fragment key={`${key}-${i}`}>
                <Typography component="li" variant="body2" sx={{ wordBreak: 'break-word' }}>
                  <Spans spans={item} />
                </Typography>
              </Fragment>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
