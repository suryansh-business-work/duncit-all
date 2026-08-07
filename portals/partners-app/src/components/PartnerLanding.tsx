import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import { landingPath } from '../config/app-config';

/**
 * What `/` does now that the portal has no dashboard of its own.
 *
 * It waits for the user before choosing. Redirecting first and correcting later
 * would bounce a venue owner through a page they never asked for, and the roles
 * are the only thing that says which section is theirs.
 */
export default function PartnerLanding() {
  const { user, loading } = useUserData();

  if (loading && !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return <Navigate to={landingPath(user?.roles)} replace />;
}
