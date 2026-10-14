import { Alert } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  linked: boolean;
  /** Where the owner changes the account when this surface cannot — the Partner console. */
  manageHref?: string;
  idPrefix: string;
}

/**
 * Whether the owner has linked a Razorpay account, read-only. The account is
 * the owner's own connection: a surface that cannot pick it (the Venues
 * console, mWeb) says whether there is one and, for the owner, where to
 * change it — and its save never names the account, so the link is left alone.
 */
export default function FoodAccountStatus({ linked, manageHref, idPrefix }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Alert
      severity={linked ? 'success' : 'info'}
      data-testid={`${idPrefix}-food-account-status`}
      action={
        manageHref ? (
          <DuncitButton
            size="small"
            color="inherit"
            href={manageHref}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            {t('venueFoodOwner.menu.accountManage')}
          </DuncitButton>
        ) : undefined
      }
    >
      {linked ? t('venueFoodOwner.menu.accountLinked') : t('venueFoodOwner.menu.accountMissing')}
    </Alert>
  );
}
