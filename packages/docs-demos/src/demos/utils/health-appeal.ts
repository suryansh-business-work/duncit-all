import {
  HEALTH_APPEAL_REASON_KEY,
  HEALTH_APPEAL_STATUS_COLOR,
  HEALTH_APPEAL_STATUS_KEY,
  healthAppealStateOf,
  isHealthAppealReason,
  type HealthAppealStatus,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface HealthAppealMock {
  delta: number;
  waived: boolean;
  appeal_status: HealthAppealStatus | null;
  reason: string;
}

export const healthAppealDemos: PackageDemo[] = [
  defineDemo<HealthAppealMock>({
    id: 'health-appeal-row',
    title: 'What one health history row offers about appeals',
    note:
      'A deduction that still counts offers Appeal. Set appeal_status to PENDING, ACCEPTED or DENIED and the row shows that chip instead; a bonus (positive delta) never offers one. Type a reason the server does not store and the form refuses it.',
    mock: { delta: -10, waived: false, appeal_status: null, reason: 'INCORRECT' },
    compute: (mock) => {
      const state = healthAppealStateOf(mock);
      const status = state && state !== 'APPEALABLE' ? state : null;
      return {
        'row shows': state ?? 'nothing',
        'status chip key': status ? HEALTH_APPEAL_STATUS_KEY[status] : '—',
        'status chip colour': status ? HEALTH_APPEAL_STATUS_COLOR[status] : '—',
        'reason accepted': isHealthAppealReason(mock.reason),
        'reason label key': isHealthAppealReason(mock.reason) ? HEALTH_APPEAL_REASON_KEY[mock.reason] : '—',
      };
    },
  }),
];
