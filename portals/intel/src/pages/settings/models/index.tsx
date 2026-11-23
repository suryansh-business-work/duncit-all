import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import SettingsCard from '../SettingsCard';
import { ChatForm, ModelsForm } from './models.form';

export { ChatForm, ModelsForm } from './models.form';
export { makeChatSchema, makeModelsSchema } from './models.types';

/** Settings › AI Models: the model list, then how answers are generated. */
export default function ModelsSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <SettingsCard section="models" title={t('intel.settings.sections.models')} subtitle={t('intel.settings.models.subtitle')}>
        {({ value, saving, errorMessage, onSave }) => <ModelsForm values={{ models: value }} saving={saving} errorMessage={errorMessage} onSubmit={(v) => onSave(v.models)} />}
      </SettingsCard>
      <SettingsCard section="chat" title={t('intel.settings.chat.title')} subtitle={t('intel.settings.chat.subtitle')}>
        {({ value, saving, errorMessage, onSave }) => <ChatForm values={value} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
      </SettingsCard>
    </Stack>
  );
}
