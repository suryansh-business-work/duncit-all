import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { CANCEL_POD_PROMO, REGENERATE_POD_PROMO_BANNER, type PodPromo } from '../queries';
import BannerThemeSelect, { themeVariable, type ThemeChoice } from '../banners/BannerThemeSelect';

interface Props {
  promo: PodPromo;
  onChanged: () => void;
}

/** A manager re-makes the carousel from the pod as it is now (in another look if they like), or cancels a promotion that has not gone out. */
export default function PromoActions({ promo, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [theme, setTheme] = useState<ThemeChoice>('');
  const [regenerate, regenState] = useMutation(REGENERATE_POD_PROMO_BANNER);
  const [cancel, cancelState] = useMutation(CANCEL_POD_PROMO);
  const busy = regenState.loading || cancelState.loading;
  const variables = { id: promo.id };
  const regenerateVariables = { id: promo.id, style: themeVariable(theme) };

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      notify(done, 'success');
      onChanged();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const cancelPromo = async () => {
    const ok = await confirm({
      title: t('marketing.podPromo.cancelTitle', { vars: { title: promo.pod_title } }),
      message: t('marketing.podPromo.cancelMessage'),
      confirmLabel: t('marketing.podPromo.cancelConfirm'),
      destructive: true,
    });
    if (ok) await run(() => cancel({ variables }), t('marketing.podPromo.cancelled'));
  };

  const fire = (work: Promise<void>) => fireAndForget(work, logs.portal.marketing, 'pod-promos', 'PromoActions');

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }} data-testid="promo-actions">
      <BannerThemeSelect value={theme} onChange={setTheme} disabled={busy} testId="promo-regenerate-theme" />
      <DuncitButton
        variant="outlined"
        startIcon={<RefreshIcon />}
        disabled={busy}
        onClick={() => fire(run(() => regenerate({ variables: regenerateVariables }), t('marketing.podPromo.regenerated')))}
      >
        {t('marketing.podPromo.regenerate')}
      </DuncitButton>
      <DuncitButton variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} disabled={busy} onClick={() => fire(cancelPromo())}>
        {t('marketing.podPromo.cancelPromo')}
      </DuncitButton>
    </Stack>
  );
}
