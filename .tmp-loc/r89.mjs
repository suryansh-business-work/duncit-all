import { apply } from "./e.mjs";
apply("website/status-website/src/components/OverallStatusBanner.test.tsx", [
  [
    "import OverallStatusBanner, { deriveOverallStatus } from './OverallStatusBanner';\nimport type { OverallRoll, ServiceState } from '../types';",
    "import OverallStatusBanner, { deriveOverallStatus } from './OverallStatusBanner';\nimport { createTranslator } from '@duncit/i18n';\nimport { STATUS_FALLBACK } from '../i18n';\nimport type { OverallRoll, ServiceState } from '../types';\n\n// The banner's sentences come from the catalogue; outside React this is the\n// shipped copy, which is what the assertions below are written against.\nconst { t } = createTranslator({ locale: 'en-IN', fallback: STATUS_FALLBACK });",
  ],
  ["deriveOverallStatus(null).severity", "deriveOverallStatus(null, t).severity"],
  ["deriveOverallStatus(roll({ total: 0 }))", "deriveOverallStatus(roll({ total: 0 }), t)"],
  [
    "deriveOverallStatus(roll({ operational: 2, total: 2, state: 'operational' }))",
    "deriveOverallStatus(roll({ operational: 2, total: 2, state: 'operational' }), t)",
  ],
  [
    "      roll({ operational: 1, degraded: 1, total: 2, state: 'degraded' as ServiceState })\n    );",
    "      roll({ operational: 1, degraded: 1, total: 2, state: 'degraded' as ServiceState }),\n      t\n    );",
  ],
  [
    "      roll({ operational: 0, down: 2, total: 2, state: 'major_outage' as ServiceState })\n    );",
    "      roll({ operational: 0, down: 2, total: 2, state: 'major_outage' as ServiceState }),\n      t\n    );",
  ],
]);
