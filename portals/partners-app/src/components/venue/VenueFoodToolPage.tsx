import { Fragment, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { FOOD_OWNER_VENUES } from '@duncit/venue-food';
import { parseApiError } from '@duncit/utils';
import StudioPageHeader from '../studio/StudioPageHeader';
import VenueFoodOffAlert from './VenueFoodOffAlert';
import VenueStudioBody from './VenueStudioBody';

interface Props {
  title: string;
  hint: string;
  /** What the venue misses while food is off — the tool's own sentence. */
  noFoodMessage: string;
  /** The page's test-id root: `<id>-page`, `<id>-error`, `<id>-no-food`. */
  testId: string;
  /** The shared tool, for the selected food-serving venue. */
  children: (venueId: string) => ReactNode;
}

/**
 * The frame of the three food desk pages — Dashboard, Food Orders and Food
 * Coupons: the studio header, the venue picker, and either the tool from
 * @duncit/venue-food for the selected venue or, when it serves no food, the
 * way to switch food on.
 */
export default function VenueFoodToolPage({ title, hint, noFoodMessage, testId, children }: Readonly<Props>) {
  const { data, loading, error } = useQuery(FOOD_OWNER_VENUES, { fetchPolicy: 'cache-and-network' });
  const errorAlert = error ? (
    <Alert severity="error" data-testid={`${testId}-error`}>
      {parseApiError(error)}
    </Alert>
  ) : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid={`${testId}-page`}>
      <StudioPageHeader title={title} hint={hint} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) =>
          venue.offers_food ? (
            <Fragment key={venue.id}>{children(venue.id)}</Fragment>
          ) : (
            <VenueFoodOffAlert message={noFoodMessage} data-testid={`${testId}-no-food`} />
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
