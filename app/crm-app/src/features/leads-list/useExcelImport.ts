import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  crmImportAutoMatch,
  crmImportFieldsFor,
  crmImportMappingInput,
  crmImportReady,
  type CrmAiLeadEntity,
} from '@duncit/utils';

import { CrmAppExcelImportDocument, CrmAppExcelInspectDocument } from '@/graphql/leadLists';
import type { Translate } from '@/i18n/fallback';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { readFileBase64 } from './readFileBase64';

/** Excel (.xlsx, .xls) and CSV — what the portal's import accepts. */
export const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
}

type Step = 'file' | 'map' | 'done';

/**
 * Leads › Import from Excel (the portal's ExcelImportDialog): pick a file, map
 * its columns to lead fields (matched by name to start with), import.
 */
export function useExcelImport(entity: CrmAiLeadEntity, t: Translate) {
  const fields = crmImportFieldsFor(entity);
  const [step, setStep] = useState<Step>('file');
  const [file, setFile] = useState<{ name: string; base64: string } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reading' | 'importing' | null>(null);

  const pickFile = async () => {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: EXCEL_TYPES,
        copyToCacheDirectory: true,
      });
      const asset = picked.canceled ? undefined : picked.assets?.[0];
      if (!asset) return;
      setBusy('reading');
      const base64 = await readFileBase64(asset.uri);
      setFile({ name: asset.name, base64 });
      const { crmExcelInspect } = await gqlRequest(CrmAppExcelInspectDocument, {
        content_base64: base64,
      });
      if (crmExcelInspect.headers.length === 0) throw new Error(t('crm.excelImport.noHeaders'));
      setHeaders(crmExcelInspect.headers);
      setMapping(crmImportAutoMatch(fields, crmExcelInspect.headers));
      setStep('map');
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.loadFailed')));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (): Promise<ImportResult | null> => {
    if (!file) return null;
    setError(null);
    setBusy('importing');
    try {
      const { crmExcelImport } = await gqlRequest(CrmAppExcelImportDocument, {
        entity,
        content_base64: file.base64,
        mapping: crmImportMappingInput(mapping),
      });
      setResult(crmExcelImport);
      setStep('done');
      return crmExcelImport;
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setStep('file');
    setFile(null);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setError(null);
  };

  return {
    step,
    fields,
    fileName: file?.name ?? null,
    headers,
    mapping,
    ready: crmImportReady(fields, mapping),
    result,
    error,
    busy,
    pickFile,
    setColumn: (field: string, header: string) =>
      setMapping((current) => ({ ...current, [field]: header })),
    runImport,
    reset,
  };
}
