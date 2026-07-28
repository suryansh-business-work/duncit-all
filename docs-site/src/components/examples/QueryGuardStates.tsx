import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';

type State = 'loading' | 'error' | 'notFound' | 'loaded';

/** A GraphQL failure shaped the way Apollo hands it to a page. */
const GRAPHQL_ERROR = {
  graphQLErrors: [{ message: 'Pod DUN-POD-4821 is no longer accepting bookings.' }],
};

const pod = { id: 'DUN-POD-4821', title: 'Saturday Supper Club — Indiranagar' };

/** All four QueryGuard branches, switchable. */
export function QueryGuardStates() {
  const [state, setState] = useState<State>('loading');

  return (
    <Stack sx={{ gap: 2 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={state}
        onChange={(_, next: State | null) => next && setState(next)}
      >
        <ToggleButton value="loading">loading</ToggleButton>
        <ToggleButton value="error">error</ToggleButton>
        <ToggleButton value="notFound">notFound</ToggleButton>
        <ToggleButton value="loaded">loaded</ToggleButton>
      </ToggleButtonGroup>

      <QueryGuard
        loading={state === 'loading'}
        error={state === 'error' ? GRAPHQL_ERROR : undefined}
        notFound={state === 'notFound'}
        notFoundSeverity="warning"
        notFoundText="No pod with that id."
      >
        {() => <Typography variant="h6">{pod.title}</Typography>}
      </QueryGuard>
    </Stack>
  );
}
