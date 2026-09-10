import type { SxProps, Theme } from '@mui/material/styles';

/**
 * The reader's half of the rich-text editor: how authored HTML looks once it is
 * rendered read-only, outside the editor that wrote it.
 *
 * Every surface that prints a policy, a contract or a ticket body used to carry
 * its own copy of this block, which is how the table support added to
 * `@duncit/rich-text` would have arrived as a borderless run of text on three
 * pages at once — a saved table that reads as prose is indistinguishable from a
 * table that never saved. Spread it and override only what a surface really
 * styles differently.
 *
 * `@duncit/rich-text` is NOT imported here on purpose: mWeb and partners-app
 * render this HTML but must not pull tiptap into their bundles to do it.
 */
export const RICH_TEXT_BODY_SX: SxProps<Theme> = {
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
  '& a': { color: 'primary.main' },
  '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontWeight: 700 },
  '& p': { mb: 1.25, lineHeight: 1.7 },
  '& ul, & ol': { pl: 3, mb: 1.5 },
  '& blockquote': {
    borderLeft: 4,
    borderColor: 'divider',
    pl: 2,
    color: 'text.secondary',
    my: 2,
  },
  '& pre': {
    bgcolor: 'action.hover',
    p: 2,
    borderRadius: 1,
    overflowX: 'auto',
    fontFamily: 'monospace',
  },
  // A table is the one block that can be wider than the column it is read in,
  // so it scrolls in its own box rather than making the page scroll sideways.
  '& table': {
    borderCollapse: 'collapse',
    display: 'block',
    maxWidth: '100%',
    my: 2,
    overflowX: 'auto',
  },
  '& th, & td': { border: 1, borderColor: 'divider', p: 1, verticalAlign: 'top' },
  '& th': { bgcolor: 'action.hover', fontWeight: 700, textAlign: 'left' },
  // The editor wraps cell content in a paragraph, which would otherwise carry
  // the bottom margin set for paragraphs above.
  '& th > p, & td > p': { m: 0 },
};
