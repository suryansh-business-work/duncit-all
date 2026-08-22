import { useState } from 'react';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** Same rule the server enforces on a companion's number (6-15 digits). */
const PHONE = /^\d{6,15}$/;

export interface CompanionValue {
  name: string;
  phone_number: string;
}

interface Props {
  /** People this ticket admits, including the buyer. */
  seats: number;
  /** How many still need a name and a phone number. */
  required: number;
  busy?: boolean;
  onSubmit: (companions: CompanionValue[]) => void;
}

const blank = (count: number): CompanionValue[] =>
  Array.from({ length: count }, () => ({ name: '', phone_number: '' }));

const complete = (rows: CompanionValue[]) =>
  rows.every((row) => row.name.trim().length >= 2 && PHONE.test(row.phone_number.trim()));

/**
 * The rest of the group, collected at the door — the Tamagui twin of mWeb's
 * CompanionsForm (rule 27), word for word through the shared bundle.
 *
 * A multi-seat ticket is a number until someone writes down who it covers, and
 * the scan is the one moment they are all standing there. The ticket does not
 * check in until every one of them has a name and a phone number.
 */
export function CompanionsForm({ seats, required, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CompanionValue[]>(() => blank(required));
  const [touched, setTouched] = useState(false);

  const set = (index: number, patch: Partial<CompanionValue>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const press = () => {
    setTouched(true);
    if (complete(rows)) onSubmit(rows.map((row) => ({ ...row, name: row.name.trim() })));
  };

  return (
    <YStack gap={10} testID="scan-companions-form">
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.hostScan.companionsTitle')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('mweb.hostScan.companionsBody', { vars: { seats, count: required } })}
      </Text>

      {rows.map((row, index) => (
        // The index IS the identity here: the rows are positional slots created
        // from a count, never reordered, added to or removed.
        <YStack key={`companion-${index}`} gap={6}>
          <Text fontSize={12} fontWeight="700" color="$muted">
            {t('mweb.hostScan.companionsHeading', { vars: { index: index + 1 } })}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {t('mweb.hostScan.companionName')} · {t('mweb.hostScan.fieldRequired')}
          </Text>
          <Input
            testID={`companion-name-${index}`}
            value={row.name}
            onChangeText={(name) => set(index, { name })}
            placeholder={t('mweb.hostScan.companionName')}
            size="$4"
          />
          <Text fontSize={11.5} color="$muted">
            {t('mweb.hostScan.companionPhone')} · {t('mweb.hostScan.fieldRequired')}
          </Text>
          <Input
            testID={`companion-phone-${index}`}
            value={row.phone_number}
            onChangeText={(phone_number) => set(index, { phone_number })}
            placeholder={t('mweb.hostScan.companionPhone')}
            keyboardType="number-pad"
            size="$4"
          />
        </YStack>
      ))}

      {touched && !complete(rows) ? (
        <Text testID="companions-incomplete" fontSize={12} color="$danger">
          {t('mweb.hostScan.companionsIncomplete')}
        </Text>
      ) : null}

      <XStack
        testID="companions-submit"
        role="button"
        aria-label={t('mweb.hostManage.markAttendance')}
        aria-disabled={busy}
        onPress={busy ? undefined : press}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        opacity={busy ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {t('mweb.hostScan.companionsSubmit')}
        </Text>
      </XStack>
    </YStack>
  );
}
