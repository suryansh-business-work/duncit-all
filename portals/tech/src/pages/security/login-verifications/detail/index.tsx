import { Stack } from '@mui/material';
import type { LogDetail } from '../queries';
import AccessHistorySection from './AccessHistorySection';
import ConsentSection from './ConsentSection';
import DeviceSection from './DeviceSection';
import ExceptionSection from './ExceptionSection';
import WhenSection from './WhenSection';
import WhereSection from './WhereSection';
import WhoSection from './WhoSection';

/** One verification, in full: who, when, where, on what, what they agreed to, and who has read it. */
export default function LogDetailSections({ detail }: Readonly<{ detail: LogDetail }>) {
  return (
    <Stack spacing={2} data-testid="login-verification-detail">
      <WhoSection detail={detail} />
      <WhenSection detail={detail} />
      <WhereSection detail={detail} />
      <DeviceSection detail={detail} />
      <ConsentSection detail={detail} />
      {detail.exception && <ExceptionSection exception={detail.exception} />}
      <AccessHistorySection entries={detail.access_history} />
    </Stack>
  );
}
