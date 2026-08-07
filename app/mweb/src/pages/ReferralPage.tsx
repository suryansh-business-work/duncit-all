import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import { referralLink } from '@duncit/utils';
import { formatRelative } from '../components/app-header/queries';

const MY_REFERRAL = gql`
  query MyReferral {
    myReferral {
      code
      gift_description
      coins_per_referral
      referred_by_name
      referred {
        user_id
        full_name
        referred_at
      }
    }
  }
`;

const APPLY_CODE = gql`
  mutation ApplyReferralCode($code: String!) {
    applyReferralCode(code: $code) {
      code
      referred_by_name
    }
  }
`;

/** Refer & Earn — my shareable code, the admin-configured gift, who I brought
 * in, and a box to redeem a friend's code (B4-11). */
export default function ReferralPage() {
  const { data, loading, error, refetch } = useQuery(MY_REFERRAL, { fetchPolicy: 'cache-and-network' });
  const [apply, applyState] = useMutation(APPLY_CODE);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const referral = data?.myReferral;

  /*
    Two things worth copying, not one.

    A code has to be typed in by whoever receives it; a link does the typing
    for them and lands on signup with the code already in hand. Both are here
    because a code still travels better by voice.
  */
  const link = referral?.code ? referralLink(referral.code, globalThis.location.origin) : '';

  const copy = async (what: 'code' | 'link', value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const redeem = async () => {
    if (!draft.trim()) return;
    await apply({ variables: { code: draft.trim() } });
    setDraft('');
    await refetch();
  };

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <CardGiftcardIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Refer &amp; Earn
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Share your code, bring friends to Duncit
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            YOUR CODE
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1 }}>
              {referral?.code}
            </Typography>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void copy('code', referral?.code ?? '')} sx={{ borderRadius: 999, fontWeight: 700 }}>
              {copied === 'code' ? 'Copied!' : 'Copy code'}
            </Button>
            <Button size="small" startIcon={<LinkIcon />} onClick={() => void copy('link', link)} sx={{ borderRadius: 999, fontWeight: 700 }}>
              {copied === 'link' ? 'Copied!' : 'Copy link'}
            </Button>
          </Stack>
          {(referral?.coins_per_referral ?? 0) > 0 && (
            <Typography variant="body2" sx={{ mt: 1.25, fontWeight: 700 }} color="primary.main">
              {referral.coins_per_referral} Duncit Coins for every friend who joins
            </Typography>
          )}
          {referral?.gift_description && (
            <Alert icon={<CardGiftcardIcon />} severity="success" sx={{ mt: 1.5, borderRadius: '16px' }}>
              {referral.gift_description}
            </Alert>
          )}
          {referral?.referred_by_name && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 700 }}>
              You were referred by {referral.referred_by_name}
            </Typography>
          )}
        </CardContent>
      </Card>

      {!referral?.referred_by_name && (
        <Card variant="outlined" sx={{ borderRadius: '16px' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Got a friend's code?
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="DUN-XXXXXX"
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
              />
              <Button variant="contained" onClick={() => void redeem().catch(() => undefined)} disabled={applyState.loading || !draft.trim()} sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
                {applyState.loading ? 'Applying…' : 'Apply'}
              </Button>
            </Stack>
            {applyState.error && <Alert severity="error" sx={{ mt: 1 }}>{applyState.error.message}</Alert>}
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
              Friends you referred
            </Typography>
            <Chip size="small" label={referral?.referred?.length ?? 0} />
          </Stack>
          {(referral?.referred ?? []).length === 0 ? (
            <Alert severity="info">No referrals yet — share your code to get started.</Alert>
          ) : (
            <Stack spacing={1}>
              {referral.referred.map((entry: any) => (
                <Stack key={entry.user_id} direction="row" alignItems="center" spacing={1} sx={{ p: 1.25, borderRadius: '16px', border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }} noWrap>
                    {entry.full_name || 'New member'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {formatRelative(entry.referred_at)} ago
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
