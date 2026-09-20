import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  /** Called with the answer. Closing the dialog any other way answers No. */
  onAnswer: (locationShared: boolean) => void;
}

/**
 * Asked once, as the name goes on the waitlist: whether the member is willing
 * to share their current location. Yes and No both add the name; the ✕ and
 * the backdrop count as No. The answer is the "Location shared" column in
 * Admin > Catalog > Subscribe for location. mWeb twin:
 * components/city-launch/CityLaunchLocationDialog (rule 27).
 */
export function CityLaunchLocationDialog({ open, onAnswer }: Readonly<Props>) {
  const { t } = useTranslation();
  const decline = () => onAnswer(false);

  return (
    <DuncitDialog
      open={open}
      onClose={decline}
      testID="city-launch-share-location"
      variant="center"
      title={t('mweb.cityLaunch.shareLocation.title')}
      closeLabel={t('mweb.common.close')}
      footer={
        <ConfirmFooter
          cancelLabel={t('mweb.cityLaunch.shareLocation.no')}
          confirmLabel={t('mweb.cityLaunch.shareLocation.yes')}
          busy={false}
          destructive={false}
          cancelTestID="city-launch-share-location-no"
          confirmTestID="city-launch-share-location-yes"
          onCancel={decline}
          onConfirm={() => onAnswer(true)}
        />
      }
    >
      {null}
    </DuncitDialog>
  );
}
