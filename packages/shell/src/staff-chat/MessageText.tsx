import Markdown from 'react-markdown';
import { Box, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CodeBlock from './CodeBlock';
import LinkCard from './LinkCard';

/** A bare URL in running text, so it can be linked without markdown syntax. */
const BARE_URL = /(https?:\/\/[^\s<>()]+)/g;

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
      <Markdown
        components={{
          a: ({ href, children }) => (
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
          ),
          code: ({ className, children }) => {
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
          },
          // react-markdown wraps a fenced block in <pre>; CodeBlock brings its
          // own, so this one would nest a scroll container inside a scroll
          // container.
          pre: ({ children }) => <>{children}</>,
          p: ({ children }) => (
            <Typography variant="body2" sx={{ fontSize: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {children}
            </Typography>
          ),
        }}
      >
        {text}
      </Markdown>

      {firstUrl && <LinkCard url={firstUrl} onNavigate={onNavigate} />}
    </Box>
  );
}
