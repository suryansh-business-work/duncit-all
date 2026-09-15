import { useLocation, useNavigate, useParams } from 'react-router';
import { Box } from '@mui/material';
import { CityLaunchView } from '../../components/city-launch';

/**
 * /city-launch/:locationId — a not-yet-launched city's waitlist on its own,
 * the link "Send this to your friends" hands out. Public: a signed-out visitor
 * sees the count and is asked to sign in to add their name. Native twin: the
 * CityLaunch screen.
 */
export default function CityLaunchPage() {
  const { locationId = '' } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // A shared link opens as the tab's first page, where Back has nowhere to go.
  const onBack = () => {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  };

  return (
    <Box data-testid="city-launch-page" sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <CityLaunchView locationId={locationId} onBack={onBack} />
    </Box>
  );
}
