import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { Alert, Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import DetailPageState from '../../../components/detail/DetailPageState';
import PageHeading from '../../../components/PageHeading';
import { useCanWrite } from '../../../lib/roles';
import {
  GENERATE_PHYSICAL_CARDS,
  PHYSICAL_POLICY,
  type PhysicalBatchRow,
  type PhysicalPolicy,
} from './queries';
import GenerateCardsForm, { type GenerateCardsValues } from './generate';

/** The API's wire format for a calendar day — not a display format. */
const ISO_DAY = 'yyyy-MM-dd';

/**
 * Loyalty > Physical Gift Cards > Generate Cards. A successful run lands on the
 * new batch, where its print file (every card number with its passcode) is
 * downloaded — the passcodes never travel in the generate call itself.
 */
export default function PhysicalGeneratePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCanWrite();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const policyQuery = useQuery<{ physicalGiftCardPolicy: PhysicalPolicy }>(PHYSICAL_POLICY, {
    fetchPolicy: 'cache-and-network',
  });
  const policy = policyQuery.data?.physicalGiftCardPolicy;
  const [generate, { loading }] = useMutation<{ generatePhysicalGiftCards: PhysicalBatchRow }>(
    GENERATE_PHYSICAL_CARDS,
  );

  const submit = async (values: GenerateCardsValues) => {
    setErrorMessage(null);
    const members = values.mode === 'MEMBERS';
    try {
      const res = await generate({
        variables: {
          input: {
            label: values.label.trim(),
            coins: Number(values.coins),
            quantity: members ? null : Number(values.quantity),
            user_ids: members ? values.members.map((m) => m.id) : null,
            expires_on: values.expires_on ? format(values.expires_on, ISO_DAY) : null,
          },
        },
      });
      const batch = res.data?.generatePhysicalGiftCards;
      if (!batch) {
        setErrorMessage(t('loyalty.physical.generateError'));
        return;
      }
      notifySuccess(t('loyalty.physical.generated', { vars: { count: batch.quantity } }));
      navigate(`/gift-cards/physical/batches/${batch.id}`);
    } catch (e) {
      // The server's reason is specific (a member who no longer exists, a cap)
      // and already in plain words; the generic line covers a network failure.
      setErrorMessage((e as { message?: string })?.message || t('loyalty.physical.generateError'));
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeading
        icon={<ConfirmationNumberIcon color="primary" sx={{ fontSize: 28 }} />}
        title={t('loyalty.physical.generateTitle')}
        subtitle={t('loyalty.physical.generateIntro')}
      />
      <DetailPageState
        loading={policyQuery.loading && !policy}
        error={policyQuery.error}
        notFound={false}
        onRetry={() => policyQuery.refetch()}
      >
        {!canWrite && <Alert severity="info">{t('loyalty.common.readOnly')}</Alert>}
        {policy && canWrite && <GenerateCardsForm policy={policy} busy={loading} errorMessage={errorMessage} onSubmit={submit} />}
      </DetailPageState>
    </Stack>
  );
}
