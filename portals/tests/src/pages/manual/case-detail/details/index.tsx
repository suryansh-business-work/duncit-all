import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { ManualCase } from '../../shared/types';
import { useSectionSave } from '../useSaveCase';
import CaseDetailsForm from './case-details.form';

interface Props {
  record: ManualCase;
}

/** The side panel: status, people, type, priority, labels, surface, dates and the E2E link. */
export default function CaseDetails({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  const { state, save } = useSectionSave(record, 'CaseDetails');
  return (
    <SectionCard title={t('testsManual.details.title')}>
      <CaseDetailsForm
        record={record}
        state={state}
        onSubmit={async (input) => {
          // An unchanged panel has nothing to send; a failed save reports itself.
          if (Object.keys(input).length > 0) await save(input);
        }}
      />
    </SectionCard>
  );
}
