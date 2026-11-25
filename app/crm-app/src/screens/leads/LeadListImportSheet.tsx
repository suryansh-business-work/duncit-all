import { fireAndForget, logs } from '@duncit/logs';
import { Text, YStack } from 'tamagui';
import type { CrmAiLeadEntity } from '@duncit/utils';

import { AuthAlert } from '@/screens/auth/AuthAlert';
import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { useExcelImport, type ImportResult } from '@/features/leads-list/useExcelImport';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListImportMapping } from './LeadListImportMapping';
import { LeadListSheet } from './LeadListSheet';

const SCOPE = 'crm-app/LeadListImportSheet';

interface Props {
  open: boolean;
  entity: CrmAiLeadEntity;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}

/** "Imported 8 of 10 rows · 2 failed". */
export function importSummary(result: ImportResult, t: ReturnType<typeof useTranslation>['t']) {
  const imported = t('crm.excelImport.imported', {
    vars: { inserted: result.inserted, total: result.inserted + result.failed },
  });
  return result.failed > 0
    ? `${imported} · ${t('crm.excelImport.failedCount', { vars: { count: result.failed } })}`
    : imported;
}

/** The import's outcome: the summary and every failed row with its reason (the portal's ImportResultView). */
function ImportResultView({ result }: Readonly<{ result: ImportResult }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text
        fontWeight="700"
        color={result.failed === 0 ? '$success' : '$warning'}
        aria-live="polite"
        testID="import-summary"
      >
        {importSummary(result, t)}
      </Text>
      {result.errors.map((error, index) => (
        <YStack key={`${error.row}-${index}`} {...SURFACE} gap="$1">
          <Text fontWeight="600">{`${t('crm.excelImport.row')} ${error.row}`}</Text>
          <Text
            color="$muted"
            fontSize="$2"
          >{`${t('crm.components.reason')}: ${error.message}`}</Text>
        </YStack>
      ))}
    </YStack>
  );
}

/** Leads › Import from Excel: choose a file, map its columns, import (the portal's ExcelImportDialog). */
export function LeadListImportSheet({ open, entity, onClose, onImported }: Readonly<Props>) {
  const { t } = useTranslation();
  const excel = useExcelImport(entity, t);
  const title =
    entity === 'VENUE_LEAD'
      ? t('crm.venueLeads.importVenueLeadsFromExcel')
      : t('crm.hostLeads.importHostLeadsFromExcel');
  const close = () => {
    excel.reset();
    onClose();
  };
  const runImport = async () => {
    const result = await excel.runImport();
    if (result) onImported(result);
  };
  return (
    <LeadListSheet
      open={open}
      title={title}
      onClose={close}
      busy={excel.busy !== null}
      testID="import-sheet"
    >
      {excel.error ? <AuthAlert message={excel.error} testID="import-error" /> : null}
      {excel.step === 'file' ? (
        <YStack gap="$3">
          <Text color="$muted">{t('crm.excelImport.intro')}</Text>
          <DuncitButton
            label={
              excel.busy === 'reading'
                ? t('crm.excelImport.reading')
                : t('crm.excelImport.chooseFile')
            }
            onPress={() => fireAndForget(excel.pickFile(), logs.mobileApp, SCOPE, 'pickFile')}
            loading={excel.busy === 'reading'}
            variant="outline"
            testID="import-choose"
          />
          <Text color="$muted" fontSize="$2" testID="import-file-name">
            {excel.fileName ?? t('crm.excelImport.noFile')}
          </Text>
        </YStack>
      ) : null}
      {excel.step === 'map' ? (
        <YStack gap="$3">
          <LeadListImportMapping
            fields={excel.fields}
            headers={excel.headers}
            mapping={excel.mapping}
            onChange={excel.setColumn}
          />
          <DuncitButton
            label={
              excel.busy === 'importing'
                ? t('crm.excelImport.importing')
                : t('crm.userLeads.import')
            }
            onPress={() => fireAndForget(runImport(), logs.mobileApp, SCOPE, 'import')}
            loading={excel.busy === 'importing'}
            disabled={!excel.ready}
            fullWidth
            testID="import-run"
          />
        </YStack>
      ) : null}
      {excel.step === 'done' && excel.result ? <ImportResultView result={excel.result} /> : null}
      <DuncitButton
        label={t('shell.common.close')}
        onPress={close}
        variant="ghost"
        disabled={excel.busy !== null}
        testID="import-close"
      />
    </LeadListSheet>
  );
}
