import { isValidElement, type ReactNode } from 'react';
import { Box, Divider, Link, Typography } from '@mui/material';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MonacoBlock from './editor/MonacoBlock';
import { fenceTag, monacoLanguage } from './editor/monaco-language';

/**
 * The package's markdown, in MUI.
 *
 * Every element is mapped to a MUI component rather than left to the browser's
 * defaults, so a doc reads like the rest of the portal instead of like a raw
 * README dropped into a card.
 */
const CODE_SX = {
  px: 0.75,
  py: 0.25,
  borderRadius: 0.75,
  bgcolor: 'action.hover',
  fontFamily: 'monospace',
  fontSize: '0.85em',
};

/**
 * A fenced block arrives as `<pre><code class="language-ts">…`. Reading the tag
 * and the text off that child is what lets the block open as an editor instead
 * of a `<pre>` — the whole reason the docs contract asks every fence to be
 * tagged.
 */
interface FenceParts {
  code: string;
  className: string;
}

function fenceOf(children: ReactNode): FenceParts {
  const child = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(child)) return { code: String(children ?? ''), className: '' };
  const props = child.props as { className?: string; children?: ReactNode };
  return { code: String(props.children ?? ''), className: props.className ?? '' };
}

const CELL_SX = { border: 1, borderColor: 'divider', px: 1.25, py: 0.75, textAlign: 'left' };

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <Typography
      variant="h5"
      sx={{
        fontWeight: 700,
        mt: 3,
        mb: 1
      }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <>
      <Divider sx={{ mt: 4, mb: 2 }} />
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 1
        }}>
        {children}
      </Typography>
    </>
  ),
  h3: ({ children }) => (
    <Typography
      variant="subtitle1"
      sx={{
        fontWeight: 700,
        mt: 2.5,
        mb: 0.75
      }}>
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 700,
        mt: 2,
        mb: 0.5
      }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body2" sx={{ my: 1.25, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body2" sx={{ my: 0.5, lineHeight: 1.6 }}>
      {children}
    </Typography>
  ),
  a: ({ children, href }) => (
    <Link href={href} target="_blank" rel="noreferrer">
      {children}
    </Link>
  ),
  blockquote: ({ children }) => (
    <Box sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2, my: 2, opacity: 0.9 }}>
      {children}
    </Box>
  ),
  // Every fenced block IS an editor. `pre` never renders its child, so the
  // `code` override below is only ever reached by inline code.
  pre: ({ children }) => {
    const { code, className } = fenceOf(children);
    return (
      <MonacoBlock
        code={code.replace(/\n$/, '')}
        language={monacoLanguage(className)}
        badge={fenceTag(className)}
      />
    );
  },
  code: ({ children }) => (
    <Box component="code" sx={CODE_SX}>
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <Box sx={{ overflowX: 'auto', my: 2 }}>
      <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        {children}
      </Box>
    </Box>
  ),
  th: ({ children }) => (
    <Box component="th" sx={{ ...CELL_SX, bgcolor: 'action.hover', fontWeight: 700 }}>
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box component="td" sx={CELL_SX}>
      {children}
    </Box>
  ),
};

export default function PackageDocBody({ markdown }: Readonly<{ markdown: string }>) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {markdown}
    </ReactMarkdown>
  );
}
