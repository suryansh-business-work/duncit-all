import SmartToyIcon from '@mui/icons-material/SmartToy';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

/** The hero-card button that opens the Ask AI drawer. */
export default function AskAiButton({ onClick }: Readonly<{ onClick: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitButton startIcon={<SmartToyIcon />} color="secondary" variant="outlined" onClick={onClick} data-testid="crm-ask-ai-open">
      {t('crm.components.askAi')}
    </DuncitButton>
  );
}
