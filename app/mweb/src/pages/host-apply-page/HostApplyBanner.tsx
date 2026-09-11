import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, Stack, Typography } from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import { DuncitButton } from '@duncit/buttons';
import { MY_HOST_REQUEST, applyButtonState, type MyHostRequest } from './queries';

/**
 * Host Studio card inviting an APPROVED host to host another category — an
 * accent mark, one title and one green CTA. Locks to "Applied" while a request
 * is in process (driven by myHostRequest). Native twin:
 * components/host-manage/HostApplyBanner.
 */
export default function HostApplyBanner() {
  const navigate = useNavigate();
  const { data } = useQuery<{ myHostRequest: MyHostRequest | null }>(MY_HOST_REQUEST, {
    fetchPolicy: 'cache-and-network',
  });
  const { label, disabled } = applyButtonState(data?.myHostRequest);

  return (
    <Card>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'secondary.main',
            bgcolor: 'action.hover',
          }}
        >
          <AddBusinessRoundedIcon />
        </Box>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>
          Ready to Host More Experiences?
        </Typography>
        <DuncitButton
          variant="contained"
          disabled={disabled}
          onClick={() => navigate('/host/apply')}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {label}
        </DuncitButton>
      </Stack>
    </Card>
  );
}
