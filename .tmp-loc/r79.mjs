import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/mweb.ts", [
  [
    "      whyAreYouRescheduling: 'Why are you rescheduling?',\n    },",
    "      whyAreYouRescheduling: 'Why are you rescheduling?',\n      subtitle: 'Pick a way to start earning on Duncit.',\n    },",
  ],
]);

apply("app/mweb/src/pages/earn-page/index.tsx", [
  [
    "import { EarnJourneyList, EarnSurfaceProvider, type EarnSurfaceConfig } from '@duncit/earn';",
    "import {\n  EarnJourneyList,\n  EarnSurfaceProvider,\n  mwebEarnMeetingLabels,\n  type EarnSurfaceConfig,\n} from '@duncit/earn';",
  ],
  [
    "      currentSlotBadge: mwebCurrentLabel(t),\n    }),",
    "      currentSlotBadge: mwebCurrentLabel(t),\n      meetingLabels: mwebEarnMeetingLabels(t),\n    }),",
  ],
  [
    "        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size=\"small\">\n          Back\n        </Button>",
    "        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size=\"small\">\n          {t('mweb.common.back')}\n        </Button>",
  ],
  [
    "        <Typography variant=\"h5\" sx={{ fontWeight: 700 }}>\n          Earn with Duncit\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\" sx={{ fontWeight: 700 }}>\n          Pick a way to start earning on Duncit.\n        </Typography>",
    "        <Typography variant=\"h5\" sx={{ fontWeight: 700 }}>\n          {t('mweb.earn.earnWithDuncit')}\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\" sx={{ fontWeight: 700 }}>\n          {t('mweb.earn.subtitle')}\n        </Typography>",
  ],
]);

apply("portals/partners-app/src/pages/earn-page/EarnPage.tsx", [
  [
    "import {\n  EarnJourneyList,\n  EarnSurfaceProvider,\n  useEarnProductsVisible,\n  type EarnSurfaceConfig,\n} from '@duncit/earn';",
    "import {\n  EarnJourneyList,\n  EarnSurfaceProvider,\n  shellEarnMeetingLabels,\n  useEarnProductsVisible,\n  type EarnSurfaceConfig,\n} from '@duncit/earn';",
  ],
  [
    "      currentSlotBadge: shellCurrentLabel(t),\n    }),",
    "      currentSlotBadge: shellCurrentLabel(t),\n      meetingLabels: shellEarnMeetingLabels(t),\n    }),",
  ],
]);
