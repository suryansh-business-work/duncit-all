import { useCallback, useState } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { LEAD_LIMITS } from '../copy';
import { parseCsv, splitHeader } from './csv';
import { emptyMapping, guessMapping, type MappingState } from './importMapping';

export interface CsvFileState {
  name: string;
  header: string[];
  rows: string[][];
}

const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });

/**
 * The chosen file, read and split into its header and rows, with a first
 * guess at which column holds what. A file that is not a CSV, has no rows,
 * or has too many is refused with the reason, and nothing is kept.
 */
export function useCsvFile() {
  const { t } = useTranslation();
  const [file, setFile] = useState<CsvFileState | null>(null);
  const [mapping, setMapping] = useState<MappingState>(emptyMapping);
  const [problem, setProblem] = useState('');

  const clear = useCallback(() => {
    setFile(null);
    setMapping(emptyMapping());
    setProblem('');
  }, []);

  const choose = useCallback(
    async (picked: File | null | undefined) => {
      if (!picked) return;
      if (!/\.csv$/i.test(picked.name)) {
        clear();
        setProblem(t('marketing.leads.fileNotCsv'));
        return;
      }
      let text: string;
      try {
        text = await readText(picked);
      } catch {
        clear();
        setProblem(t('marketing.leads.fileUnreadable'));
        return;
      }
      const { header, body } = splitHeader(parseCsv(text));
      if (body.length === 0) {
        clear();
        setProblem(t('marketing.leads.fileEmpty'));
        return;
      }
      if (body.length > LEAD_LIMITS.importRows) {
        clear();
        setProblem(t('marketing.leads.fileTooLarge', { vars: { max: LEAD_LIMITS.importRows } }));
        return;
      }
      setProblem('');
      setFile({ name: picked.name, header, rows: body });
      setMapping(guessMapping(header));
    },
    [clear, t],
  );

  return { file, mapping, setMapping, problem, choose, clear };
}
