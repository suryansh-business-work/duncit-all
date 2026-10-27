import { lazy } from 'react';
import { Container } from '@mui/material';
import { useLiteSession } from '../../../shared/session';

const LandingPage = lazy(async () => ({ default: (await import('./LandingPage')).LandingPage }));
const EventsHomePage = lazy(async () => ({ default: (await import('../home')).EventsHomePage }));

/**
 * lite.duncit.com itself: the landing page for a visitor, your events once
 * signed in. The route draws edge to edge (the landing hero needs it), so the
 * signed-in page brings its own container.
 */
export function HomeGate() {
  const { signedIn } = useLiteSession();
  if (!signedIn) return <LandingPage />;
  return (
    <Container maxWidth={false} sx={{ maxWidth: 1040, py: { xs: 2, md: 4 } }}>
      <EventsHomePage />
    </Container>
  );
}
