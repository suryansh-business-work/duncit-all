import { XStack } from 'tamagui';

import { IconAction } from '@/components/settings-editors/IconAction';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The row's name as a reader hears it ("Move Instagram up"). */
  label: string;
  index: number;
  count: number;
  /** Omit for a list whose order does not matter (bands). */
  onMove?: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  testID: string;
}

/** Move up / move down / delete for one row of a list, each named after the row. */
export function RowControls({ label, index, count, onMove, onRemove, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = { vars: { name: label } };
  return (
    <XStack alignItems="center">
      {onMove ? (
        <>
          <IconAction
            icon="arrow-upward"
            label={t('crm.a11y.moveUpNamed', name)}
            onPress={() => onMove(index, index - 1)}
            disabled={index === 0}
            testID={`${testID}-up`}
          />
          <IconAction
            icon="arrow-downward"
            label={t('crm.a11y.moveDownNamed', name)}
            onPress={() => onMove(index, index + 1)}
            disabled={index === count - 1}
            testID={`${testID}-down`}
          />
        </>
      ) : null}
      <IconAction
        icon="delete"
        label={t('crm.common.deleteNamed', name)}
        onPress={() => onRemove(index)}
        danger
        testID={`${testID}-delete`}
      />
    </XStack>
  );
}
