import { useEffect } from 'react';
import { Modal } from 'react-native';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Validation for a saved address — RN twin of mWeb's addressSchema. */
export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Give this address a label').max(60),
  name: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200),
  landmark: z.string().trim().max(160),
  city: z.string().trim().min(1, 'City is required').max(120),
  state: z.string().trim().min(1, 'State is required').max(120),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'Enter a valid pincode'),
  country: z.string().trim().max(80),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

export const blankAddressValues: AddressFormValues = {
  label: 'Home',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

interface Props {
  open: boolean;
  title: string;
  initial?: AddressFormValues | null;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressFormValues) => void;
}

interface FieldProps {
  name: keyof AddressFormValues;
  label: string;
  control: ReturnType<typeof useForm<AddressFormValues>>['control'];
}

function Field({ name, label, control }: Readonly<FieldProps>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <Text fontSize={11.5} fontWeight="800" color="$muted">
            {label}
          </Text>
          <Input
            testID={`address-${name}`}
            aria-label={label}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            borderRadius={12}
            borderColor={fieldState.error ? '$danger' : '$borderColor'}
          />
          {fieldState.error ? (
            <Text fontSize={11} color="$danger" testID={`address-${name}-error`}>
              {fieldState.error.message}
            </Text>
          ) : null}
        </YStack>
      )}
    />
  );
}

/** Add/edit sheet for one saved address (React Hook Form + Zod). RN twin of
 * mWeb's AddressForm dialog. */
export function AddressFormSheet({
  open,
  title,
  initial,
  saving = false,
  onCancel,
  onSubmit,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { control, handleSubmit, reset } = useForm<AddressFormValues>({
    defaultValues: initial ?? blankAddressValues,
    resolver: zodResolver(addressSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initial ?? blankAddressValues);
  }, [open, initial, reset]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onCancel}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} justifyContent="flex-end" testID="address-form-sheet">
            <YStack
              role="button"
              aria-label="Close"
              onPress={onCancel}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.6)"
            />
            <YStack
              maxHeight="88%"
              backgroundColor="$background"
              borderTopLeftRadius={22}
              borderTopRightRadius={22}
              padding={16}
              gap={10}
            >
              <Text fontSize={17} fontWeight="900" color="$color">
                {title}
              </Text>
              <ScrollView>
                <YStack gap={10} paddingBottom={12}>
                  <Field name="label" label="Label (Home, Office…)" control={control} />
                  <Field name="name" label="Receiver name" control={control} />
                  <Field name="phone" label="Phone" control={control} />
                  <Field name="line1" label="Address line 1" control={control} />
                  <Field name="line2" label="Address line 2" control={control} />
                  <Field name="landmark" label="Landmark" control={control} />
                  <Field name="city" label="City" control={control} />
                  <Field name="state" label="State" control={control} />
                  <Field name="pincode" label="Pincode" control={control} />
                  <Field name="country" label="Country" control={control} />
                </YStack>
              </ScrollView>
              <XStack gap={12}>
                <XStack
                  testID="address-cancel"
                  role="button"
                  aria-label="Cancel"
                  onPress={onCancel}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="address-save"
                  role="button"
                  aria-label="Save address"
                  aria-disabled={saving}
                  onPress={saving ? undefined : handleSubmit(onSubmit)}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  backgroundColor="$primary"
                  opacity={saving ? 0.6 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    Save address
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
