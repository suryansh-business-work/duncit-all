import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/shell';
import PersonalFields from '../../../fields/PersonalFields';
import { personalSchema } from '../../../fields/employee-fields.schema';
import { personalValuesFrom } from '../../../fields/employee-fields.defaults';
import FormShell from '../FormShell';
import type { PersonalFormProps, PersonalFormValues, PersonalOutput } from './personal.types';

/** Edit name, gender, birth date, contact details and emergency contact. */
export default function PersonalForm({ personal, onSubmit, onCancel }: Readonly<PersonalFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => personalSchema(t), [t]);
  const methods = useForm<PersonalFormValues, unknown, PersonalOutput>({ resolver: zodResolver(schema), defaultValues: personalValuesFrom(personal) });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('shell.common.save')} testId="hr-personal-form">
      <PersonalFields />
    </FormShell>
  );
}
