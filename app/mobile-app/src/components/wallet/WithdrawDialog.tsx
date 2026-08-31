import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatMoney } from '@duncit/utils';
import { Spinner, Text, XStack, YStack } from 'tamagui';

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
  type WithdrawMethod,
  type WithdrawValues,
} from './withdraw.form';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  maxAmount: number;
  /** Role-wise Minimum Withdrawal Amount as sent by the server. 0 = no floor. */
  minAmount: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

const METHODS: WithdrawMethod[] = ['UPI', 'IMPS', 'NEFT'];

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
    resolver: zodResolver(makeWithdrawSchema(maxAmount, minAmount, t)),
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
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="withdraw-dialog">
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
              backgroundColor="$background"
              borderRadius={20}
              padding={18}
            >
              <SafeAreaView edges={[]} style={SHEET_SAFE_AREA}>
                <Text fontSize={17} fontWeight="700" color="$color" paddingBottom={10}>
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
                    <XStack gap={8}>
                      {METHODS.map((m) => (
                        <XStack
                          key={m}
                          testID={`withdraw-method-${m}`}
                          role="button"
                          aria-label={`Pay via ${m}`}
                          onPress={() => setValue('payout_method', m)}
                          flex={1}
                          height={40}
                          alignItems="center"
                          justifyContent="center"
                          borderRadius={10}
                          borderWidth={1}
                          borderColor={method === m ? '$primary' : '$borderColor'}
                          backgroundColor={method === m ? '$primary' : 'transparent'}
                          pressStyle={PRESS_STYLE.control}
                        >
                          <Text
                            fontSize={13}
                            fontWeight="600"
                            color={method === m ? '$onPrimary' : '$color'}
                          >
                            {m}
                          </Text>
                        </XStack>
                      ))}
                    </XStack>
                    {method === 'UPI' ? (
                      <FormTextField
                        control={control}
                        name="upi_id"
                        label={t('mweb.wallet.upiId')}
                        autoCapitalize="none"
                        required
                      />
                    ) : (
                      <>
                        <FormTextField
                          control={control}
                          name="account_holder_name"
                          label={t('mweb.wallet.accountHolderName')}
                          required
                        />
                        <FormTextField
                          control={control}
                          name="account_number"
                          label={t('mweb.wallet.accountNumber')}
                          keyboardType="numeric"
                          required
                        />
                        <FormTextField
                          control={control}
                          name="ifsc_code"
                          label={t('mweb.wallet.ifscCode')}
                          autoCapitalize="characters"
                          required
                        />
                      </>
                    )}
                    {error ? (
                      <Text testID="withdraw-error" fontSize={12.5} color="$danger">
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <XStack gap={12} paddingTop={12}>
                  <XStack
                    testID="withdraw-cancel"
                    role="button"
                    aria-label={t('mweb.common.cancel')}
                    aria-disabled={busy}
                    onPress={dismiss}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                    opacity={busy ? 0.6 : 1}
                    pressStyle={PRESS_STYLE.control}
                  >
                    <Text fontSize={14} fontWeight="600" color="$color">
                      Cancel
                    </Text>
                  </XStack>
                  <XStack
                    testID="withdraw-submit"
                    role="button"
                    aria-label={t('mweb.wallet.requestWithdrawal')}
                    aria-disabled={busy}
                    onPress={busy ? undefined : () => fireAndForget(submit())}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={busy ? 0.7 : 1}
                    pressStyle={PRESS_STYLE.control}
                  >
                    {busy ? <Spinner size="small" color={onPrimary} /> : null}
                    <Text fontSize={14} fontWeight="700" color="$onPrimary">
                      {busy ? 'Requesting…' : 'Request'}
                    </Text>
                  </XStack>
                </XStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
