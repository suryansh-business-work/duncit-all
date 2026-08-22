import { blankMeetingReasonValues, meetingReasonSchema } from '@duncit/earn';
import { defineDemo, defineDemos } from '../types';

interface ReasonMock {
  reason: string;
}

export default defineDemos('earn', [
  defineDemo<ReasonMock>({
    id: 'reason',
    title: 'Cancelling or rescheduling an onboarding meeting needs a reason',
    note:
      'Empty it and the form refuses. The reason is not paperwork: it is what the onboarding team reads before deciding whether to offer another slot.',
    mock: { reason: 'Something came up at the venue — can we move this to next week?' },
    compute: (mock) => {
      const parsed = meetingReasonSchema.safeParse(mock);
      return {
        Valid: parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map((issue) => issue.message),
        'Blank values the dialog opens with': blankMeetingReasonValues,
        'Where the same schema is used':
          'Both the reschedule and the cancel dialog, in mWeb and in Partners — one rule, three surfaces.',
      };
    },
  }),
]);
