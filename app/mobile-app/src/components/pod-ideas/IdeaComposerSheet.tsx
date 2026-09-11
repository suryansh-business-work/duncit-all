import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { NewPodIdeaInput } from '@/hooks/usePodIdeas';
import {
  CategoryCascadeField,
  EMPTY_CATEGORY_SCOPE,
  type CategoryLabels,
  type CategoryScope,
} from './CategoryCascadeField';
import { IdeaSheetHeader } from './IdeaSheetHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewPodIdeaInput) => Promise<void>;
}

const EMPTY_LABELS: CategoryLabels = {
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
};

/** Bottom sheet to share a new pod idea: title, description and the mandatory
 * Super → Category → Sub hierarchy. RN port of mWeb's composer dialog. */
export function IdeaComposerSheet({ open, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<CategoryScope>(EMPTY_CATEGORY_SCOPE);
  const [labels, setLabels] = useState<CategoryLabels>(EMPTY_LABELS);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setScope(EMPTY_CATEGORY_SCOPE);
    setLabels(EMPTY_LABELS);
    setError('');
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const onCategoryChange = (next: CategoryScope, nextLabels: CategoryLabels) => {
    setScope(next);
    setLabels(nextLabels);
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      setError(t('mweb.podIdeas.titleAndDescriptionAreBothRequired'));
      return;
    }
    if (!scope.super_category_id || !scope.category_id || !scope.sub_category_id) {
      setError(t('mweb.podIdeas.pleaseSelectASuperCategoryCategory'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ title, description, ...scope, ...labels });
      reset();
      onClose();
    } catch {
      setError(t('mweb.podIdeas.couldNotSubmitYourIdeaPlease'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="idea-composer-sheet">
            <YStack
              pressStyle={PRESS_STYLE.surface}
              role="button"
              aria-label={t('mweb.common.close')}
              onPress={close}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              maxHeight="88%"
              backgroundColor="$surface"
              borderTopLeftRadius={28}
              borderTopRightRadius={28}
            >
              <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
                <IdeaSheetHeader
                  title="Share a pod idea"
                  closeTestID="idea-composer-close"
                  onClose={close}
                />

                <ScrollView keyboardShouldPersistTaps="handled">
                  <YStack gap={10} paddingHorizontal={16} paddingBottom={16}>
                    <Field label={t('mweb.common.title')} gap={4}>
                      <Input
                        testID="idea-title-input"
                        aria-label={t('mweb.common.title')}
                        value={title}
                        onChangeText={(t) => setTitle(t.slice(0, 160))}
                        placeholder={t('mweb.common.title')}
                        placeholderTextColor="$muted"
                        backgroundColor="$soft"
                        borderRadius={14}
                      />
                    </Field>
                    <Field label={t('mweb.common.description')} gap={4}>
                      <Input
                        testID="idea-description-input"
                        aria-label={t('mweb.common.description')}
                        value={description}
                        onChangeText={(t) => setDescription(t.slice(0, 2000))}
                        placeholder={t('mweb.podIdeas.describeTheVibeFormatLocationAudience')}
                        placeholderTextColor="$muted"
                        backgroundColor="$soft"
                        borderRadius={14}
                        multiline
                        numberOfLines={5}
                        minHeight={120}
                      />
                    </Field>
                    <CategoryCascadeField
                      value={scope}
                      onChange={onCategoryChange}
                      idPrefix="idea-composer-cat"
                    />
                    {error ? (
                      <Text testID="idea-composer-error" color="$danger" fontSize={12.5}>
                        {error}
                      </Text>
                    ) : null}
                    <XStack
                      testID="idea-composer-submit"
                      role="button"
                      aria-label={t('mweb.podIdeas.submitIdea')}
                      aria-disabled={submitting}
                      onPress={submit}
                      height={52}
                      alignItems="center"
                      justifyContent="center"
                      gap={8}
                      borderRadius={999}
                      backgroundColor="$primary"
                      opacity={submitting ? 0.7 : 1}
                      pressStyle={PRESS_STYLE.solid}
                    >
                      {submitting ? <Spinner size="small" color={onPrimary} /> : null}
                      <Text fontSize={15} fontWeight="600" color={onPrimary}>
                        {submitting ? 'Submitting…' : 'Submit'}
                      </Text>
                    </XStack>
                  </YStack>
                </ScrollView>
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
