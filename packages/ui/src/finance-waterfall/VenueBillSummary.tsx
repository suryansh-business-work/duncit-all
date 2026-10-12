import { Divider, Link, Stack, Typography } from '@mui/material';
import type { VenueBillLine } from '@duncit/utils';

export interface VenueBillSummaryProps {
  /** `buildVenueBillLines(...)` — every figure is the server's. */
  lines: readonly VenueBillLine[];
  /** Section heading. Omitted where the surrounding card already names it. */
  title?: string;
  /** The uploaded bill, linked under the lines when there is one. */
  billUrl?: string | null;
  /** The link's text — required for `billUrl` to render. */
  viewBillLabel?: string;
}

/**
 * The venue-bill summary at Complete Pod and on Finance's Payment Release
 * page: attendees, the earlier slot price, the final bill and the venue total
 * they come to. Native twin: app/mobile-app host-manage/VenueBillSummary.
 */
export default function VenueBillSummary({
  lines,
  title,
  billUrl,
  viewBillLabel,
}: Readonly<VenueBillSummaryProps>) {
  return (
    <Stack spacing={0.75} data-testid="venue-bill-summary">
      {title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      <Stack spacing={0.5} divider={<Divider flexItem />}>
        {lines.map((line) => (
          <Stack
            key={line.key}
            direction="row"
            spacing={2}
            data-testid={`venue-bill-line-${line.key}`}
            sx={{ justifyContent: 'space-between' }}
          >
            <Typography variant="body2" sx={{ fontWeight: line.strong ? 700 : 400 }}>
              {line.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: line.strong ? 700 : 400 }}>
              {line.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {billUrl && viewBillLabel && (
        <Link href={billUrl} target="_blank" rel="noreferrer" variant="body2">
          {viewBillLabel}
        </Link>
      )}
    </Stack>
  );
}
