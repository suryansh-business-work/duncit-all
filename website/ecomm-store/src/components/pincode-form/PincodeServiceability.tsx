import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { PINCODE } from '@duncit/regex';
import { useDebouncedValue } from '@duncit/ui';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { STORE_PINCODE_SERVICEABLE } from '../../graphql/settings';
import { useStoreT } from '../../i18n';

const DEBOUNCE_MS = 400;

/**
 * Whether the operator's own pincode list covers what was typed. Only asked
 * while the store keeps such a list; otherwise the courier decides at checkout
 * and nothing is said here. Saving stays allowed either way.
 */
export function PincodeServiceability({ pincode }: Readonly<{ pincode: string }>) {
  const { t } = useStoreT();
  const { serviceable_pincodes_enabled: keepsList } = useStoreSettings();
  const debounced = useDebouncedValue(pincode.trim(), DEBOUNCE_MS);
  const ready = keepsList && PINCODE.test(debounced);
  const { data, loading } = useQuery(STORE_PINCODE_SERVICEABLE, { variables: { pincode: debounced }, skip: !ready });
  const check = ready ? data?.storePincodeServiceable : undefined;
  const verdictKnown = Boolean(check?.restricted);
  return (
    <Stack aria-live="polite" data-testid="pincode-serviceability">
      {ready && loading ? (
        <Typography variant="body2" color="text.secondary">
          {t('ecommStore.deliverTo.checking')}
        </Typography>
      ) : null}
      {verdictKnown && check?.serviceable ? (
        <Alert severity="success" data-testid="pincode-serviceable">
          {t('ecommStore.deliverTo.serviceable', { vars: { pincode: check.pincode } })}
        </Alert>
      ) : null}
      {verdictKnown && check && !check.serviceable ? (
        <Alert severity="warning" data-testid="pincode-not-serviceable">
          {t('ecommStore.deliverTo.notServiceable', { vars: { pincode: check.pincode } })}
        </Alert>
      ) : null}
    </Stack>
  );
}
