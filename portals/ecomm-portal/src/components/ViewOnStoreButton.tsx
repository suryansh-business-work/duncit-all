import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface ViewOnStoreButtonProps {
  href: string;
  /** The button's words; "View on store" when omitted. */
  label?: string;
}

/** Opens a page of the live store in a new tab — and says so to a screen reader. */
export default function ViewOnStoreButton({ href, label }: Readonly<ViewOnStoreButtonProps>) {
  const { t } = useTranslation();
  const text = label ?? t('ecommPortal.common.viewOnStore');
  return (
    <DuncitButton
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="outlined"
      startIcon={<OpenInNewIcon />}
      aria-label={t('ecommPortal.common.opensInNewTab', { vars: { label: text } })}
    >
      {text}
    </DuncitButton>
  );
}
