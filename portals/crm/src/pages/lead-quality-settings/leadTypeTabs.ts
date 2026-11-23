import type { DuncitTabItem } from '@duncit/tabs';
import type { useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { LEAD_TYPES } from '../../components/lead-quality/qualityLabels';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';

type Translate = ReturnType<typeof useTranslation>['t'];

/** One tab per lead type, each with its own versioned scoring model; the URL's ?selectedtab= names the type. */
export const leadTypeTabs = (t: Translate): DuncitTabItem<CrmLeadEntityType>[] =>
  LEAD_TYPES.map((type) => ({ value: type, label: t(LEAD_KIND_LABEL_KEY[type]), testId: `lead-quality-tab-${type}` }));
