import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Box, keyframes } from '@mui/material';
import { CART_BADGE_MAX } from '@duncit/utils';

/** A quick lift and settle — "something just landed here". */
const bump = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
`;

/**
 * How many times the count has gone UP since mount. It keys the glyph, so each
 * add restarts the bump; a decrement, or the count the page loaded with, never
 * plays it.
 */
function useIncreaseCount(count: number): number {
  const [increases, setIncreases] = useState(0);
  const previous = useRef(count);
  useEffect(() => {
    if (count > previous.current) setIncreases((value) => value + 1);
    previous.current = count;
  }, [count]);
  return increases;
}

/**
 * One tab's glyph. Every tab is drawn through the badge, not just the cart:
 * MUI renders nothing for `badgeContent={0}`, so a single branchless wrapper
 * carries the cart count and leaves the other four untouched. When the count
 * rises the glyph bumps once — skipped for anyone who asked for less motion.
 */
export default function BottomNavIcon({
  icon,
  count,
  badgeTestId,
}: Readonly<{ icon: ReactNode; count: number; badgeTestId?: string }>) {
  const increases = useIncreaseCount(count);
  return (
    <Box className="nav-icon-wrap">
      <Box
        key={increases}
        sx={(theme) => ({
          display: 'inline-flex',
          animation:
            increases > 0
              ? `${bump} ${theme.transitions.duration.complex}ms ${theme.transitions.easing.easeOut}`
              : 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        })}
      >
        <Badge data-testid={badgeTestId} badgeContent={count} color="secondary" max={CART_BADGE_MAX}>
          {icon}
        </Badge>
      </Box>
    </Box>
  );
}
