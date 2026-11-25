import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useWatch } from 'react-hook-form';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Notice } from '@/components/email-templates/Notice';
import { StateView } from '@/components/StateView';
import { TabBar } from '@/components/TabBar';
import { useEmailTemplateEditor } from '@/features/email-templates/useEmailTemplateEditor';
import { EmailAiDialog } from '@/forms/email-template-ai';
import { SendTestDialog } from '@/forms/email-template-test';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';
import { AttachmentsCard } from './AttachmentsCard';
import { EditorActions } from './EditorActions';
import { EditorDetailsCard } from './EditorDetailsCard';
import { ImageLibraryModal } from './ImageLibraryModal';
import { MjmlSourceCard } from './MjmlSourceCard';
import { PreviewPane } from './PreviewPane';
import type { AppStackParamList } from '@/navigation/types';
import { VariablesPane } from './VariablesPane';

const SCOPE = 'crm-app/EmailTemplateEditorScreen';
type Dialog = 'test' | 'delete' | 'ai' | 'images' | null;

/** CRM › Email Templates › one template: the portal's editor — MJML, live preview, variables, attachments. */
export function EmailTemplateEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'EmailTemplateEditor'>>();
  const editor = useEmailTemplateEditor(params.id);
  const { template, form } = editor;
  const [tab, setTab] = useState('preview');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [name, variables, attachments] = useWatch({
    control: form.control,
    name: ['name', 'variables', 'attachments'],
  });

  useEffect(() => {
    navigation.setOptions({ title: template?.name ?? t('shell.nav.emailTemplates') });
  }, [navigation, template?.name, t]);

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await editor.remove();
      setDialog(null);
      navigation.goBack();
    } catch (err) {
      setDeleteError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setDeleting(false);
    }
  };

  if (!template) {
    return (
      <YStack flex={1} backgroundColor="$background" padding="$4">
        <StateView
          loading={editor.loading}
          error={editor.error}
          empty={t('crm.emailTemplates.templateNotFound')}
          onRetry={editor.refetch}
        />
      </YStack>
    );
  }
  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {editor.status ? (
          <Notice
            tone={editor.status.tone}
            onClose={() => editor.setStatus(null)}
            testID="editor-status"
          >
            {editor.status.message}
          </Notice>
        ) : null}
        <EditorDetailsCard control={form.control} slug={template.slug} />
        <MjmlSourceCard
          control={form.control}
          onFormat={editor.format}
          onVerify={() => fireAndForget(editor.validate(), logs.mobileApp, SCOPE, 'verify')}
          onImages={() => setDialog('images')}
          onAi={() => setDialog('ai')}
        />
        <TabBar
          tabs={[
            { key: 'preview', label: t('crm.common.preview') },
            { key: 'variables', label: t('crm.emailTemplates.variables') },
          ]}
          active={tab}
          onChange={setTab}
          testID="editor-tab"
        />
        {tab === 'preview' ? (
          <PreviewPane name={name} html={editor.preview.html} errors={editor.preview.errors} />
        ) : (
          <VariablesPane
            target={template.target}
            control={form.control}
            fields={editor.variables.fields}
            values={variables}
            declared={editor.declared}
            detected={editor.preview.detected}
            onToggle={editor.toggleVariable}
            onSync={editor.syncDetected}
            onRemove={editor.variables.remove}
          />
        )}
        <AttachmentsCard
          attachments={attachments}
          onAdd={editor.attachments.append}
          onRemove={editor.attachments.remove}
        />
        <EditorActions
          control={form.control}
          dirty={form.formState.isDirty}
          busy={form.formState.isSubmitting}
          onSave={() => fireAndForget(editor.save(), logs.mobileApp, SCOPE, 'save')}
          onSendTest={() => setDialog('test')}
          onDelete={() => {
            setDeleteError(null);
            setDialog('delete');
          }}
        />
      </ScrollView>
      <SendTestDialog
        open={dialog === 'test'}
        templateId={template.template_id}
        varsJson={editor.varsJson}
        onSent={(message) => editor.setStatus({ tone: 'success', message })}
        onClose={() => setDialog(null)}
      />
      <EmailAiDialog
        open={dialog === 'ai'}
        currentMjml={form.getValues('mjml')}
        target={template.target}
        onApply={editor.applyAi}
        onClose={() => setDialog(null)}
      />
      <ImageLibraryModal
        open={dialog === 'images'}
        templateId={template.template_id}
        images={editor.images}
        onChangeImages={editor.setImages}
        onInsert={editor.insertImage}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title={t('crm.emailTemplates.deleteTemplate')}
        message={t('crm.emailTemplates.deleteTemplateMessage', { vars: { name: template.name } })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={() => fireAndForget(remove(), logs.mobileApp, SCOPE, 'delete')}
        onCancel={() => setDialog(null)}
        testID="editor-delete-dialog"
      />
    </YStack>
  );
}
