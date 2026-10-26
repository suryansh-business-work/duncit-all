import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  EarnBox,
  blankMeetingReasonValues,
  buildEarnMeetingLabels,
  buildMeetingReasonSchema,
} from '@duncit/earn';
import { defineDemo, defineDemos } from '../types';

interface ReasonMock {
  reason: string;
}

interface CardMock {
  testId: string;
  title: string;
  description: string;
  disabled: boolean;
  disabledLabel: string;
  ctaLabel: string | null;
}

export default defineDemos('earn', [
  defineDemo<ReasonMock>({
    id: 'reason',
    title: 'Cancelling or rescheduling an onboarding meeting needs a reason',
    note:
      'Empty it and the form refuses. The reason is not paperwork: it is what the onboarding team reads before deciding whether to offer another slot.',
    mock: { reason: 'Something came up at the venue — can we move this to next week?' },
    compute: (mock) => {
      // The messages come from the catalogue, so the schema takes the same
      // labels the dialog renders — the key itself stands in for a translator.
      const parsed = buildMeetingReasonSchema(
        buildEarnMeetingLabels((key) => key, 'mweb'),
      ).safeParse(mock);
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
  defineDemo<CardMock>({
    id: 'card',
    title: 'A journey card and the test ids it carries',
    note:
      'Set `ctaLabel` to see the approved state, or `disabled` alone for a locked card. Every part derives its `data-testid` from `testId` — the same strings as the native EarnBox — so an E2E spec selects them on any surface.',
    mock: {
      testId: 'earn-box-VENUE_OWNER',
      title: 'By registering your venue',
      description: 'List your space as a Duncit venue and host pods or rent it out.',
      disabled: true,
      disabledLabel: 'Already enabled',
      ctaLabel: 'Ready to register another venue?',
    },
    render: (mock) => (
      <EarnBox
        testId={mock.testId}
        icon={<StorefrontIcon />}
        title={mock.title}
        description={mock.description}
        onOpen={() => undefined}
        disabled={mock.disabled}
        disabledLabel={mock.disabledLabel}
        cta={mock.ctaLabel ? { label: mock.ctaLabel, onClick: () => undefined } : undefined}
      />
    ),
    compute: (mock) => ({
      Card: mock.testId,
      'Clickable area': `${mock.testId}-open`,
      'Title / description': [`${mock.testId}-title`, `${mock.testId}-description`],
      'Locked chip': mock.disabled ? `${mock.testId}-enabled` : 'not rendered — the card is open',
      'Next-step button': mock.ctaLabel ? `${mock.testId}-cta` : 'not rendered — no role held',
    }),
  }),
]);
