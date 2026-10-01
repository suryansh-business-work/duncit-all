import type { Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '../i18n';
import type { CouponFormValues } from '../coupon';
import type { CouponPodOption } from '../queries';

interface Props {
  control: Control<CouponFormValues, any, CouponFormValues>;
  /** The scope the form currently holds — the pod select only exists for POD. */
  scope: CouponFormValues['scope'];
  lockedPod?: CouponPodOption | null;
  pods: CouponPodOption[];
}

/** Where a coupon applies: everywhere, or on one pod — and then which pod. */
export default function CouponScopeFields({ control, scope, lockedPod, pods }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={2}>
      <RhfTextField
        control={control}
        name="scope"
        select
        label={t('shell.coupons.scope')}
        size="small"
        disabled={!!lockedPod}
      >
        <MenuItem value="GLOBAL">{t('shell.coupons.scopeGlobal')}</MenuItem>
        <MenuItem value="POD">{t('shell.coupons.scopePod')}</MenuItem>
      </RhfTextField>
      {scope === 'POD' && (
        <RhfTextField
          control={control}
          name="pod_id"
          select
          label={t('shell.coupons.pod')}
          size="small"
          required
          disabled={!!lockedPod}
        >
          {lockedPod ? (
            <MenuItem value={lockedPod.id}>{lockedPod.title}</MenuItem>
          ) : (
            pods.map((pod) => (
              <MenuItem key={pod.id} value={pod.id}>
                {pod.title}
              </MenuItem>
            ))
          )}
        </RhfTextField>
      )}
    </Stack>
  );
}
