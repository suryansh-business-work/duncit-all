import { formResolver } from '../../../utils/form-resolver';
import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useForm } from 'react-hook-form';
import { formatMoney } from '@duncit/utils';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { RequestWithdrawalDocument } from '@/graphql/wallet';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  blankWithdrawValues,
  buildWithdrawInput,
  makeWithdrawSchema,
  type WithdrawValues,
} from '../withdraw.form';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { MethodPicker } from './MethodPicker';
import { PayoutFields } from './PayoutFields';
import { WithdrawActions } from './WithdrawActions';

interface Props {
  open: boolean;
  maxAmount: number;
  /** Role-wise Minimum Withdrawal Amount as sent by the server. 0 = no floor. */
  minAmount: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

export function WithdrawDialog({
  open,
  maxAmount,
  minAmount,
  currency,
  onClose,
  onDone,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, setValue, watch } = useForm<WithdrawValues, any, WithdrawValues>({
    resolver: formResolver<WithdrawValues>(makeWithdrawSchema(maxAmount, minAmount, t)),
    defaultValues: blankWithdrawValues,
  });
  const method = watch('payout_method');
  const minHint =
    minAmount > 0
      ? t('mweb.wallet.minimumHint', {
          vars: { amount: formatMoney(minAmount, { symbol: currency }) },
        })
      : undefined;
  // Both hints when a floor applies, not one INSTEAD of the other — the ceiling
  // is still true and the user needs both bounds. mWeb shows the same pair
  // (rule 27: the two must not tell the same wallet different things).
  const ceilingHint = `Up to ${formatMoney(maxAmount, { symbol: currency })}`;
  const amountHint = minHint ? `${minHint} · ${ceilingHint}` : ceilingHint;

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        RequestWithdrawalDocument,
        { input: buildWithdrawInput(values) },
        { auth: true },
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mweb.wallet.couldNotRequestTheWithdrawal'));
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen flush>
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            testID="withdraw-dialog"
            onAccessibilityEscape={dismiss}
          >
            <YStack
              pressStyle={PRESS_STYLE.surface}
              role="button"
              aria-label={t('mweb.common.close')}
              onPress={dismiss}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              width="92%"
              maxWidth={460}
              maxHeight="86%"
              backgroundColor="$surface"
              borderRadius={28}
              padding={20}
            >
              <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
                <Text
                  role="heading"
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                  paddingBottom={12}
                >
                  Withdraw {currency}
                  {maxAmount.toFixed(2)} max
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <FormTextField
                      control={control}
                      name="amount"
                      label={t('mweb.wallet.amount')}
                      keyboardType="numeric"
                      required
                      hint={amountHint}
                    />
                    <MethodPicker method={method} onPick={(m) => setValue('payout_method', m)} />
                    <PayoutFields control={control} method={method} />
                    {error ? (
                      <Text testID="withdraw-error" role="alert" fontSize={12.5} color="$danger">
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <WithdrawActions
                  busy={busy}
                  onPrimary={onPrimary}
                  onDismiss={dismiss}
                  onSubmit={() => fireAndForget(submit())}
                />
              </ModalSafeArea>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
