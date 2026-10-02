import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { POD_DELETE_REASON_SUBJECTS } from '../pod-edit.form';

/** The mandatory reason — one radio per admin-agreed subject. */
export function DeleteReasonPicker({
  subject,
  onSubject,
}: Readonly<{ subject: string; onSubject: (subject: string) => void }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={10} role="radiogroup" aria-label={t('mweb.common.reason')}>
      {POD_DELETE_REASON_SUBJECTS.map((item) => {
        const selected = subject === item;
        return (
          <XStack
            key={item}
            testID={`pod-delete-reason-${item}`}
            tabIndex={0}
            role="radio"
            aria-label={item}
            aria-checked={selected}
            onPress={() => onSubject(item)}
            alignItems="center"
            padding={12}
            borderRadius={14}
            borderWidth={1}
            borderColor={selected ? '$primary' : '$cardBorder'}
            backgroundColor={selected ? '$primary' : '$surface'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={14} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
              {item}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}
