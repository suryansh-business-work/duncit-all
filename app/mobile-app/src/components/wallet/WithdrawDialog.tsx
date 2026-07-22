import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { RequestWithdrawalDocument } from '@/graphql/wallet';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  blankWithdrawValues,
  buildWithdrawInput,
  buildWithdrawSchema,
  type WithdrawMethod,
  type WithdrawValues,
} from './withdraw.form';

interface Props {
  open: boolean;
  maxAmount: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}

const METHODS: WithdrawMethod[] = ['UPI', 'IMPS', 'NEFT'];

export function WithdrawDialog({ open, maxAmount, currency, onClose, onDone }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, setValue, watch } = useForm<WithdrawValues>({
    resolver: zodResolver(buildWithdrawSchema(maxAmount)),
    defaultValues: blankWithdrawValues,
  });
  const method = watch('payout_method');

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
      setError(err instanceof Error ? err.message : 'Could not request the withdrawal');
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
              role="button"
              aria-label="Close"
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
              <SafeAreaView edges={[]}>
                <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={10}>
                  Withdraw {currency}
                  {maxAmount.toFixed(2)} max
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <FormTextField
                      control={control}
                      name="amount"
                      label="Amount"
                      keyboardType="numeric"
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
                          pressStyle={{ opacity: 0.8 }}
                        >
                          <Text
                            fontSize={13}
                            fontWeight="800"
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
                        label="UPI ID"
                        autoCapitalize="none"
                      />
                    ) : (
                      <>
                        <FormTextField
                          control={control}
                          name="account_holder_name"
                          label="Account holder name"
                        />
                        <FormTextField
                          control={control}
                          name="account_number"
                          label="Account number"
                          keyboardType="numeric"
                        />
                        <FormTextField
                          control={control}
                          name="ifsc_code"
                          label="IFSC code"
                          autoCapitalize="characters"
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
                    aria-label="Cancel"
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
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="800" color="$color">
                      Cancel
                    </Text>
                  </XStack>
                  <XStack
                    testID="withdraw-submit"
                    role="button"
                    aria-label="Request withdrawal"
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
                    pressStyle={{ opacity: 0.85 }}
                  >
                    {busy ? <Spinner size="small" color={onPrimary} /> : null}
                    <Text fontSize={14} fontWeight="900" color="$onPrimary">
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
