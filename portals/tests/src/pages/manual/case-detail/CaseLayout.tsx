import { Grid, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ManualCase } from '../shared/types';
import CaseDetails from './details';
import CaseHeader from './CaseHeader';
import CaseMeta from './CaseMeta';
import CaseTabs from './CaseTabs';
import RichSection from './rich-section';
import CaseSteps from './steps';

interface Props {
  record: ManualCase;
}

/** The issue page: the case's body on the left, its details beside it (below it on a phone). */
export default function CaseLayout({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <CaseHeader record={record} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <RichSection
              record={record}
              field="description"
              title={t('testsManual.field.description')}
              emptyText={t('testsManual.detail.emptyDescription')}
            />
            <RichSection
              record={record}
              field="preconditions"
              title={t('testsManual.field.preconditions')}
              emptyText={t('testsManual.detail.emptyPreconditions')}
            />
            <CaseSteps record={record} />
            <RichSection
              record={record}
              field="expected_result"
              title={t('testsManual.field.expectedResult')}
              emptyText={t('testsManual.detail.emptyExpected')}
            />
            <RichSection
              record={record}
              field="actual_result"
              title={t('testsManual.field.actualResult')}
              emptyText={t('testsManual.detail.emptyActual')}
            />
            <CaseTabs caseId={record.id} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <CaseDetails record={record} />
            <CaseMeta record={record} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
