import type { Control, Path } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { FlowValues } from './e2e-flow.types';

interface Props<T extends FlowValues> {
  control: Control<T>;
  nameHint: string;
}

/** Name + description — the head of both a flow and a sub flow. */
export default function FlowHeadFields<T extends FlowValues>({
  control,
  nameHint,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  return (
    <>
      <RhfTextField
        control={control}
        name={'name' as Path<T>}
        label={t('shell.common.name')}
        hint={nameHint}
        required
      />
      <RhfTextField
        control={control}
        name={'description' as Path<T>}
        label={t('shell.common.description')}
        hint={t('tech.e2eFlows.descriptionHint')}
        multiline
        minRows={2}
      />
    </>
  );
}
