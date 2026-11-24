import type { useTranslation } from '@duncit/shell';
import type { CrmSlackChannel } from '../../api/appDownload.gql';
import type { CrmAppChannelsValues } from './crm-app-channels.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface CrmAppChannelsFormProps {
  /** The channels stored now; the form re-arms to them after every save. */
  initial: CrmAppChannelsValues;
  channels: CrmSlackChannel[];
  saving?: boolean;
  onSubmit: (values: CrmAppChannelsValues) => void;
}

export type { CrmAppChannelsValues };
