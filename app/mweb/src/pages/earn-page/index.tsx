import { gql, useQuery } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import EarnBox from './EarnBox';

const EARN_ME = gql`
  query EarnMe {
    me {
      user_id
      roles
    }
  }
`;

const BOXES = [
  {
    role: 'HOST',
    title: 'By hosting a pod',
    description: 'Run meetups and experiences for your community and earn from paid pods.',
    to: '/survey/host',
    icon: <DashboardIcon />,
  },
  {
    role: 'VENUE_OWNER',
    title: 'By registering your venue',
    description: 'List your space as a Duncit venue and host pods or rent it out.',
    to: '/survey/venue',
    icon: <StorefrontIcon />,
  },
  {
    role: 'ECOMM_MANAGER',
    title: 'By listing your product',
    description: 'Sell your products to the Duncit community through pods and the shop.',
    to: '/survey/ecomm',
    icon: <Inventory2Icon />,
  },
];

/** "Earn with Duncit" — three ways to start earning. A box is disabled when the
 * user already holds the matching role. */
export default function EarnPage() {
  const { data } = useQuery(EARN_ME, { fetchPolicy: 'cache-and-network' });
  const roles: string[] = data?.me?.roles ?? [];

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 } }}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 950 }}>
          Earn with Duncit
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          Pick a way to start earning on Duncit.
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
        {BOXES.map((box) => (
          <EarnBox
            key={box.role}
            icon={box.icon}
            title={box.title}
            description={box.description}
            to={box.to}
            disabled={roles.includes(box.role)}
          />
        ))}
      </Stack>
    </Stack>
  );
}
