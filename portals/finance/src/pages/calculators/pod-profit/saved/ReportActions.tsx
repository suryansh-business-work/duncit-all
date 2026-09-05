import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { Stack, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { downloadBase64File } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import EmailReportDialog from './EmailReportDialog';
import { POD_CALCULATOR_PDF } from './queries';

interface Props {
  calculatorId: string;
  calculatorName: string;
  /** Unsaved edits are not in the report — the server renders what it stored. */
  disabled: boolean;
}

/** Filename for the saved copy, matching what the emailed attachment is called. */
const fileNameFor = (name: string) => {
  const slug = name
    .replaceAll(/[^\w\s-]+/g, '')
    .trim()
    .replaceAll(/\s+/g, '-');
  return `${slug || 'pod-profit'}-report.pdf`;
};

/**
 * Download the report, or email it.
 *
 * Both doors ask the SERVER for the PDF rather than drawing one in the browser:
 * it renders through the same finance engine that settles real pods, so the file
 * a partner is emailed and the file saved here are the same bytes and neither
 * can drift from what the pods actually pay.
 */
export default function ReportActions({ calculatorId, calculatorName, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [emailOpen, setEmailOpen] = useState(false);
  const [fetchPdf, pdfState] = useLazyQuery<any>(POD_CALCULATOR_PDF, {
    fetchPolicy: 'network-only',
  });

  const onDownload = () => {
    fetchPdf({ variables: { calculator_doc_id: calculatorId } })
      .then((res) => {
        const base64 = res.data?.podCalculatorPdfBase64;
        if (!base64) throw new Error(t('finance.calculators.reportUnavailable'));
        downloadBase64File(base64, fileNameFor(calculatorName), 'application/pdf');
        return undefined;
      })
      .catch((error: Error) => notifyError(error.message));
  };

  const hint = disabled ? t('finance.calculators.saveBeforeExport') : '';

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Tooltip title={hint}>
          <span>
            <DuncitButton
              size="small"
              startIcon={<PictureAsPdfIcon />}
              onClick={onDownload}
              disabled={disabled || pdfState.loading}
            >
              {t('finance.calculators.downloadPdf')}
            </DuncitButton>
          </span>
        </Tooltip>
        <Tooltip title={hint}>
          <span>
            <DuncitButton
              size="small"
              startIcon={<EmailOutlinedIcon />}
              onClick={() => setEmailOpen(true)}
              disabled={disabled}
            >
              {t('finance.calculators.emailReport')}
            </DuncitButton>
          </span>
        </Tooltip>
      </Stack>

      <EmailReportDialog
        open={emailOpen}
        calculatorId={calculatorId}
        calculatorName={calculatorName}
        onClose={() => setEmailOpen(false)}
      />
    </>
  );
}
