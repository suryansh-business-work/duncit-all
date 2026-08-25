import { Card, CardContent, Typography } from '@mui/material';
import { PodParticipationTimeline } from '@duncit/ui';
import { participationInputFrom, type PodParticipationFields } from '@duncit/utils';
import { fmtDate } from './queries';

interface Props {
  participation: PodParticipationFields | null;
  podDateTime?: string | null;
  /** This page's request — marked so Finance can see which branch it is. */
  backoutNo: string;
}

/**
 * The booking this refund came off, end to end.
 *
 * It used to be a flat strip of this one request's lifecycle events, which
 * could not say what the member is looking at: that they asked twice, that
 * they kept two of three seats, or that the pod was cancelled out from under
 * them. Same component and same nodes as Pod History now, so a support call is
 * two people reading one story — and this request's DUN-BKO id is marked, which
 * is what ties the branch to the row Finance opened it from.
 */
export default function BackoutTimeline({ participation, podDateTime, backoutNo }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          Backout Timeline
        </Typography>
        {participation ? (
          <PodParticipationTimeline
            input={participationInputFrom(participation, podDateTime)}
            formatDateTime={fmtDate}
            highlightBackoutNo={backoutNo}
          />
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The booking behind this request is no longer on file.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
