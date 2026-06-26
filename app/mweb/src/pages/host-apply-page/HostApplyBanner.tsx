import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import { MY_HOST_REQUEST, applyButtonState, type MyHostRequest } from './queries';

/**
 * Bottom-of-Host-Studio CTA inviting an APPROVED host to host another category.
 * Locks to "Applied" while a request is in process (driven by myHostRequest).
 */
export default function HostApplyBanner() {
  const navigate = useNavigate();
  const { data } = useQuery<{ myHostRequest: MyHostRequest | null }>(MY_HOST_REQUEST, {
    fetchPolicy: 'cache-and-network',
  });
  const { label, disabled } = applyButtonState(data?.myHostRequest);

  return (
    <Card
      sx={{
        borderRadius: 4,
        color: 'common.white',
        background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
        boxShadow: '0 12px 30px rgba(255,79,115,0.30)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ p: { xs: 2.25, sm: 3 } }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.18)',
          }}
        >
          <AddBusinessRoundedIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
            Ready to Host More Experiences?
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
            You&apos;ve already inspired a community with one category. Why stop there? Expand your
            journey, showcase another skill, and start hosting experiences in a new category.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          disabled={disabled}
          onClick={() => navigate('/host/apply')}
          sx={{
            borderRadius: 999,
            fontWeight: 950,
            whiteSpace: 'nowrap',
            bgcolor: 'common.white',
            color: '#ff4f73',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.6)', color: 'rgba(255,79,115,0.7)' },
          }}
        >
          {label}
        </Button>
      </Stack>
    </Card>
  );
}
