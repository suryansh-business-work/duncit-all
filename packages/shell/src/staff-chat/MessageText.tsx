import { Children, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { Box, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CodeBlock from './CodeBlock';
import LinkCard from './LinkCard';
import { splitMentions } from './mentions';

/** A bare URL in running text, so it can be linked without markdown syntax. */
const BARE_URL = /(https?:\/\/[^\s<>()]+)/g;

/**
 * Paint the @names inside a rendered paragraph.
 *
 * Applied to the STRING children markdown produced, so a mention inside bold
 * or a list item is still a mention, and one inside a code span is left alone —
 * code is where an @ means something else entirely.
 */
function withMentions(children: ReactNode): ReactNode {
  return Children.map(children, (child, index) => {
    if (typeof child !== 'string') return child;
    return splitMentions(child).map((part, partIndex) =>
      part.mention ? (
        <Box
          component="span"
          // Index is stable here: the parts come from splitting one immutable
          // string, so nothing can reorder between renders.
          key={`m-${index}-${partIndex}`}
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          {part.text}
        </Box>
      ) : (
        part.text
      )
    );
  });
}

type MarkdownLinkProps = Readonly<{ href?: string; children?: ReactNode }>;
type MarkdownCodeProps = Readonly<{ className?: string; children?: ReactNode }>;
type MarkdownChildren = Readonly<{ children?: ReactNode }>;

function MarkdownLink({ href, children }: MarkdownLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      color="inherit"
      underline="always"
      sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.25, wordBreak: 'break-all' }}
    >
      {children}
      <OpenInNewIcon sx={{ fontSize: 11 }} />
    </Link>
  );
}

function MarkdownCode({ className, children }: MarkdownCodeProps) {
  const body = String(children).replace(/\n$/, '');
  // A fenced block carries a language class; inline code does not.
  const language = /language-(\w+)/.exec(className ?? '')?.[1];
  if (!className && !body.includes('\n')) {
    return (
      <Box
        component="code"
        sx={{
          px: 0.5,
          py: 0.1,
          borderRadius: 0.75,
          bgcolor: 'action.hover',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.92em',
        }}
      >
        {body}
      </Box>
    );
  }
  return <CodeBlock code={body} language={language} />;
}

// react-markdown wraps a fenced block in <pre>; CodeBlock brings its
// own, so this one would nest a scroll container inside a scroll
// container.
function MarkdownPre({ children }: MarkdownChildren) {
  return <>{children}</>;
}

function MarkdownParagraph({ children }: MarkdownChildren) {
  return (
    <Typography variant="body2" sx={{ fontSize: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {withMentions(children)}
    </Typography>
  );
}

const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownLink,
  code: MarkdownCode,
  pre: MarkdownPre,
  p: MarkdownParagraph,
};

interface Props {
  text: string;
  fontSize: number;
  onNavigate?: (path: string) => void;
}

/**
 * The words of a message.
 *
 * Markdown through `react-markdown`, which renders to React elements and never
 * to raw HTML — the important property when the input is another person's
 * message. Bold, italic, inline code, lists and fenced blocks are what people
 * actually use in a work chat.
 *
 * Links get two treatments. The FIRST link in a message becomes a preview card
 * underneath — enough to judge it, and for one of our own consoles, whether you
 * can even open it. Every link inline stays a link, and an outside one carries
 * the little arrow that says it leaves.
 */
export default function MessageText({ text, fontSize, onNavigate }: Readonly<Props>) {
  // One card, not one per link: five cards under a message of five links is a
  // wall, and the first is the one being talked about almost every time.
  const firstUrl = BARE_URL.exec(text)?.[0] ?? null;
  BARE_URL.lastIndex = 0;

  return (
    <Box sx={{ fontSize, '& p': { m: 0 }, '& p + p': { mt: 0.75 }, '& ul, & ol': { my: 0.5, pl: 2.5 } }}>
      <Markdown components={MARKDOWN_COMPONENTS}>{text}</Markdown>

      {firstUrl && <LinkCard url={firstUrl} onNavigate={onNavigate} />}
    </Box>
  );
}
