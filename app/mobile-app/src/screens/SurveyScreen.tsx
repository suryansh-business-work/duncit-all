import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, Text, YStack } from 'tamagui';

import { AppHeader } from '@/components/AppHeader';
import { SuperCategoryGroup } from '@/components/survey/SuperCategoryGroup';
import { SurveyFooter } from '@/components/survey/SurveyFooter';
import { SurveyProgress } from '@/components/survey/SurveyProgress';
import { MIN_PICKS } from '@/constants/survey-palette';
import { useSurveyData, useSurveyTree } from '@/hooks/useSurvey';
import { useAuthStore } from '@/stores/auth.store';
import { useSurveyStore } from '@/stores/survey.store';
import { toErrorMessage } from '@/utils/errors';

export function SurveyScreen() {
  const { data, isLoading, error } = useSurveyData();
  const save = useSurveyStore((s) => s.save);
  const saving = useSurveyStore((s) => s.saving);
  const completeSurvey = useAuthStore((s) => s.completeSurvey);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opError, setOpError] = useState<string | null>(null);

  const { supers, childrenByParent, total } = useSurveyTree(data?.categoryTree);

  useEffect(() => {
    setSelected(new Set(data?.me?.interest_category_ids ?? []));
  }, [data?.me?.interest_category_ids]);

  const toggle = (id: string) => {
    setOpError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = selected.size;
  const progress = Math.min(100, Math.round((count / Math.max(MIN_PICKS, 1)) * 100));
  const canSubmit = count >= MIN_PICKS && !saving;

  const submit = async () => {
    setOpError(null);
    try {
      await save(Array.from(selected));
      completeSurvey();
    } catch (e) {
      setOpError(toErrorMessage(e, 'Could not save your interests'));
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AppHeader minimal />
        <YStack paddingHorizontal={20} paddingVertical={4}>
          <SurveyProgress value={progress} />
        </YStack>

        <ScrollView
          testID="survey-screen"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 168, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap={4} paddingBottom={12}>
            <Text fontSize={30} fontWeight="800" color="$color">
              What&apos;s your vibe? ✨
            </Text>
            <Text fontSize={14} color="$muted">
              Pick at least {MIN_PICKS} interests across categories to find your tribe.
            </Text>
          </YStack>

          {isLoading && !data ? (
            <YStack alignItems="center" paddingVertical={40}>
              <Spinner testID="survey-loading" color="$primary" />
            </YStack>
          ) : error ? (
            <Text color="$danger" testID="survey-error">
              {toErrorMessage(error)}
            </Text>
          ) : (
            <YStack gap={12}>
              {supers.map((superCategory) => (
                <SuperCategoryGroup
                  key={superCategory.id}
                  superCategory={superCategory}
                  childrenByParent={childrenByParent}
                  selected={selected}
                  onToggle={toggle}
                />
              ))}
            </YStack>
          )}

          {opError ? (
            <Text marginTop={12} color="$danger" testID="survey-op-error">
              {opError}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <SurveyFooter
        count={count}
        total={total}
        saving={saving}
        canSubmit={canSubmit}
        onSubmit={submit}
      />
    </YStack>
  );
}
