import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  busy: boolean;
  onPress: () => void;
}

/** The next page of a paged Club Admin list, on tap. */
export function LoadMoreButton({ testID, busy, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <PillButton
      testID={testID}
      label={t('mweb.clubStudio.loadMore')}
      onPress={onPress}
      variant="ghost"
      disabled={busy}
    />
  );
}
