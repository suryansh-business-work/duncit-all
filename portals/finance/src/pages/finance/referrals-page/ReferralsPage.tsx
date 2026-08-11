import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { notifySuccess } from '@duncit/dialogs';
import { useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { referralLink, renderReferralMessage } from '@duncit/utils';
import { urlConfigs } from '../../../config/url-configs';
import ReferralSettingsCard from './ReferralSettingsCard';
import ReferralsTable from './ReferralsTable';
import {
  REFERRALS_TABLE,
  REFERRAL_SETTINGS,
  UPDATE_REFERRAL_SETTINGS,
  type ReferralRow,
  type ReferralSettings,
} from './queries';
import {
  BLANK_SETTINGS,
  referralSettingsSchema,
  toFormValues,
  type ReferralSettingsForm,
} from './referral-settings.schema';

/** A stand-in code for the preview — a real one belongs to a real member. */
const SAMPLE_CODE = 'DUN-9F3A2C';

/** Finance > Referrals — what a referral pays, what it says, and who brought whom. */
export default function ReferralsPage() {
  const client = useApolloClient();
  const { data, loading, refetch } = useQuery<{ referralSettings: ReferralSettings }>(
    REFERRAL_SETTINGS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [updateMut, { loading: saving }] = useMutation(UPDATE_REFERRAL_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<ReferralSettingsForm>({
    resolver: zodResolver(referralSettingsSchema),
    defaultValues: BLANK_SETTINGS,
    mode: 'onBlur',
  });

  const settings = data?.referralSettings;
  useEffect(() => {
    if (settings) reset(toFormValues(settings));
  }, [settings, reset]);

  /*
    The preview reads the LIVE message as it is typed — the whole point of an
    editable template is seeing what it turns into before committing to it. The
    coin count comes from the SAVED rate instead, because this page no longer
    owns it: it renders whatever Duncit Coin > Settings currently pays.
  */
  const draftMessage = useWatch({ control, name: 'share_message' });
  const coinsPerReferral = settings?.coins_per_referral ?? 0;
  const preview = renderReferralMessage(draftMessage ?? '', {
    code: SAMPLE_CODE,
    link: referralLink(SAMPLE_CODE, urlConfigs.mwebUrl),
    coins: coinsPerReferral,
  });

  const fetchTable = useApolloTableFetch<ReferralRow>(client, REFERRALS_TABLE, 'referralsTable');
  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const page = await fetchTable(q);
      setTotal(page.total);
      return page;
    },
    [fetchTable],
  );

  const save = handleSubmit(async (values) => {
    setError(null);
    try {
      await updateMut({
        variables: {
          input: {
            gift_description: values.gift_description,
            share_message: values.share_message,
          },
        },
      });
      await refetch();
      notifySuccess('Referral settings saved');
    } catch (e: any) {
      setError(e.message ?? 'Could not save the referral settings.');
    }
  });

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <CardGiftcardIcon color="primary" sx={{ fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Referrals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            What a referral pays, the message members share, and every code redeemed so far.
          </Typography>
        </Box>
        {total != null && <Chip size="small" label={total} />}
      </Stack>

      <Stack spacing={2}>
        <Alert severity="info">
          A code is redeemed once per account, at signup. The rate is read when it is redeemed and
          never re-read, so changing it here never rewrites what a past referral already paid.
        </Alert>

        {error && <Alert severity="error">{error}</Alert>}

        <ReferralSettingsCard
          control={control}
          preview={preview}
          coinsPerReferral={coinsPerReferral}
        />

        <Box>
          <Button
            variant="contained"
            disabled={!formState.isDirty || saving}
            onClick={() => {
              save().catch(() => undefined);
            }}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </Box>

        <ReferralsTable fetchRows={fetchRows} />
      </Stack>
    </Box>
  );
}
