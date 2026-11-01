import { Stack } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onNewLead: () => void;
  onImport: () => void;
}

/** The two ways a person adds leads by hand: one at a time, or a file of them. */
export default function LeadsToolbar({ onNewLead, onImport }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} data-tour="leads-actions" data-testid="leads-toolbar">
      <DuncitButton variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={onImport} data-testid="leads-import">
        {t('marketing.leads.importCsv')}
      </DuncitButton>
      <DuncitButton variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={onNewLead} data-testid="leads-new">
        {t('marketing.leads.newLead')}
      </DuncitButton>
    </Stack>
  );
}
