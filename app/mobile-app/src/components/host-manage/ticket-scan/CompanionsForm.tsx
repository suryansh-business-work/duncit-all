import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  areCompanionEntriesComplete,
  blankCompanionEntries,
  companionEntriesToInput,
  type CompanionEntry,
  type CompanionRecordInput,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { useCompanionOtp } from '@/hooks/useCompanionOtp';
import { CompanionRow } from './CompanionRow';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Row identity, handed out once per row and never reused.
 *
 * A CompanionEntry is {name, phone_extension, phone_number, otp_challenge_id} —
 * it carries no id, and giving it one would ripple through the shared schema,
 * companionEntriesToInput, the server input type and both apps' tests for the
 * sake of a React key. So the keys live beside the rows instead, seeded in the
 * same initialiser, which is what useFieldArray does internally on the MUI side.
 */
let nextCompanionKey = 0;

interface Props {
  /** The pod being checked into — what a companion's code is raised against. */
  podId: string;
  /** The booking these people are coming in on. */
  membershipId: string;
  /** People this ticket admits, including the buyer. */
  seats: number;
  /** How many still need a name and a phone number. */
  required: number;
  busy?: boolean;
  onSubmit: (companions: CompanionRecordInput[]) => void;
}

/**
 * The rest of the group, collected at the door — the Tamagui twin of mWeb's
 * CompanionsForm (rule 27), word for word through the shared bundle.
 *
 * A multi-seat ticket is a number until someone writes down who it covers, and
 * the scan is the one moment they are all standing there. The ticket does not
 * check in until every one of them has a name and a phone number.
 *
 * Each row can also send that number a WhatsApp code, one person at a time.
 * That part is OPTIONAL and deliberately so: a dead phone or a number abroad
 * must never hold a group at the door, so the code records who was actually
 * proved rather than deciding who gets in.
 */
export function CompanionsForm({
  podId,
  membershipId,
  seats,
  required,
  busy,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CompanionEntry[]>(() => blankCompanionEntries(required));
  const [rowKeys] = useState<string[]>(() =>
    rows.map(() => {
      nextCompanionKey += 1;
      return `companion-${nextCompanionKey}`;
    }),
  );
  const [touched, setTouched] = useState(false);
  const otp = useCompanionOtp(
    podId,
    membershipId,
    t('mweb.attendance.otpCodeInvalid'),
    t('mweb.hostScan.companionOtpFailed'),
  );

  // A proof names ONE number. Retyping the name or the number makes it a
  // different person, so the challenge it earned no longer describes this row.
  const edit = (index: number, patch: Partial<CompanionEntry>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch, otp_challenge_id: '' } : row)),
    );

  const keepProof = (index: number, otp_challenge_id: string) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, otp_challenge_id } : row)),
    );

  const press = () => {
    setTouched(true);
    if (areCompanionEntriesComplete(rows)) onSubmit(companionEntriesToInput(rows));
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
        <CompanionRow
          key={rowKeys[index]}
          index={index}
          entry={row}
          otp={otp}
          onChange={edit}
          onVerified={keepProof}
        />
      ))}

      {touched && !areCompanionEntriesComplete(rows) ? (
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
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {t('mweb.hostScan.companionsSubmit')}
        </Text>
      </XStack>
    </YStack>
  );
}
