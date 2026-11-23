import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

/**
 * An answer as Markdown → React elements (never raw HTML — the text came from a
 * model). `[S2]` citation tags become small links to the source list below.
 */

type Kids = Readonly<{ children?: ReactNode }>;

/** `[S2]` → a link the `a` renderer turns into a citation chip. */
export const linkCitations = (text: string): string => text.replace(/\[(S\d{1,3})\](?!\()/g, '[$1](#cite-$1)');

const COMPONENTS = {
  p: ({ children }: Kids) => (
    <Typography variant="body2" component="p" sx={{ my: 0.75, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }: Kids & { href?: string }) => {
    if (href?.startsWith('#cite-')) {
      return (
        <Link href={href} underline="none" sx={{ display: 'inline-block', px: 0.75, mx: 0.25, borderRadius: 2, bgcolor: 'action.selected', color: 'text.primary', fontSize: '0.7rem', fontWeight: 600, lineHeight: '18px', verticalAlign: 'baseline', '&:hover, &:focus-visible': { bgcolor: 'action.focus' } }}>
          {children}
        </Link>
      );
    }
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </Link>
    );
  },
  pre: ({ children }: Kids) => (
    <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5, overflowX: 'auto', fontSize: '0.8125rem', my: 1 }}>
      {children}
    </Box>
  ),
  code: ({ children }: Kids) => (
    <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
      {children}
    </Box>
  ),
  table: ({ children }: Kids) => (
    <TableContainer sx={{ my: 1, border: 1, borderColor: 'divider', borderRadius: 1.5, maxWidth: '100%' }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }: Kids) => <TableHead>{children}</TableHead>,
  tbody: ({ children }: Kids) => <TableBody>{children}</TableBody>,
  tr: ({ children }: Kids) => <TableRow>{children}</TableRow>,
  th: ({ children }: Kids) => <TableCell sx={{ fontWeight: 700 }}>{children}</TableCell>,
  td: ({ children }: Kids) => <TableCell>{children}</TableCell>,
};

export default function AnswerMarkdown({ text }: Readonly<{ text: string }>) {
  return (
    <Box sx={{ '& ul, & ol': { my: 0.5, pl: 3 }, '& li': { fontSize: '0.875rem', lineHeight: 1.7 }, wordBreak: 'break-word' }}>
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {linkCitations(text)}
      </Markdown>
    </Box>
  );
}
