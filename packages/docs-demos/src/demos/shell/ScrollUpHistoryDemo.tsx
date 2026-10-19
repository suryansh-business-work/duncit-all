import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useScrollUpHistory } from '@duncit/shell';
import { hasOlderPage, mergeEarlierMessages, olderPageCursor } from '@duncit/utils';

export interface ScrollUpHistoryMock {
  /** Who the conversation is with. */
  peer: string;
  /** Lines in the whole conversation on the "server". */
  totalLines: number;
  /** Lines per page — the portals use CHAT_HISTORY_PAGE (30); smaller here so paging shows. */
  pageSize: number;
  /** How long the "server" takes to answer a page, in ms. */
  latencyMs: number;
}

export const SCROLL_UP_HISTORY_MOCK: ScrollUpHistoryMock = {
  peer: 'Asha Rao · Finance',
  totalLines: 64,
  pageSize: 12,
  latencyMs: 600,
};

interface Line {
  id: string;
  text: string;
  created_at: string;
}

/** The whole conversation, oldest first, one line a minute from 09:00 UTC. */
function conversation(total: number): Line[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `staff-msg-${i + 1}`,
    text: `Payout batch DUN-PAY-${4800 + i + 1} reconciled`,
    created_at: new Date(Date.UTC(2026, 9, 19, 9, i)).toISOString(),
  }));
}

/** The server's answer: at most `size` lines older than `before`, oldest first. */
function pageBefore(all: Line[], before: string | null, size: number): Line[] {
  const older = before ? all.filter((line) => line.created_at < before) : all;
  return older.slice(Math.max(0, older.length - size));
}

/**
 * A staff thread over a mock server: it opens on the newest page, and reading
 * up to the top fetches the page before — the line you were on stays put.
 */
export function ScrollUpHistoryDemo({ peer, totalLines, pageSize, latencyMs }: Readonly<ScrollUpHistoryMock>) {
  const all = useRef<Line[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    all.current = conversation(totalLines);
    const first = pageBefore(all.current, null, pageSize);
    setLines(first);
    setHasMore(hasOlderPage(first.length, pageSize));
  }, [totalLines, pageSize]);

  // Opens on the newest line.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && lines.length <= pageSize) node.scrollTop = node.scrollHeight;
  }, [lines, pageSize]);

  const loadOlder = useCallback(() => {
    const before = olderPageCursor(lines, (line) => line.created_at);
    setLoading(true);
    setTimeout(() => {
      const page = pageBefore(all.current, before, pageSize);
      setLines((current) => mergeEarlierMessages(page, current));
      setHasMore(hasOlderPage(page.length, pageSize));
      setLoading(false);
    }, latencyMs);
  }, [lines, pageSize, latencyMs]);

  const history = useScrollUpHistory({
    scrollRef,
    oldestId: lines[0]?.id ?? null,
    hasMore,
    loading,
    onLoadOlder: loadOlder,
  });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">
        {peer} — {lines.length} of {totalLines} lines loaded
      </Typography>
      <Box
        ref={scrollRef}
        onScroll={history.onScroll}
        aria-busy={loading}
        sx={{ height: 240, overflowY: 'auto', overflowAnchor: 'none', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}
      >
        {loading && (
          <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={20} aria-label="Loading earlier lines" />
          </Box>
        )}
        {!hasMore && (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary' }}>
            Start of the conversation
          </Typography>
        )}
        {lines.map((line) => (
          <Typography key={line.id} variant="body2" sx={{ py: 0.5 }}>
            {line.text}
          </Typography>
        ))}
      </Box>
    </Stack>
  );
}
