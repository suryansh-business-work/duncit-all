import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/shell';
import { dayKeyOf } from '@duncit/utils';
import PayFields from '../../../fields/PayFields';
import { paySchema } from '../../../fields/employee-fields.schema';
import { emptyPay, payValuesFrom } from '../../../fields/employee-fields.defaults';
import FormShell from '../FormShell';
import type { PayFormProps, PayFormValues, PayOutput } from './pay.types';

/** A new pay revision from its effective date, seeded from the revision in force so a raise only changes what moves. */
export default function PayForm({ current, currency, template, onSubmit, onCancel }: Readonly<PayFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => paySchema(t), [t]);
  const today = dayKeyOf(new Date());
  const methods = useForm<PayFormValues, unknown, PayOutput>({
    resolver: zodResolver(schema),
    defaultValues: current ? payValuesFrom(current, today) : emptyPay(currency, today, 'REVISION'),
  });
  return (
    <FormShell methods={methods} onSubmit={onSubmit} onCancel={onCancel} submitLabel={t('shell.common.save')} testId="hr-pay-form">
      <PayFields template={template} showReason />
    </FormShell>
  );
}
