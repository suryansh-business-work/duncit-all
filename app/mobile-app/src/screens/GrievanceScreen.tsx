import { useMemo, useState } from 'react';
import { Button, ScrollView, Text, YStack } from 'tamagui';
import { grievanceSupportTicketOptions, type SubmittedGrievance } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { GrievanceEscalationNotice } from '@/components/support/grievance/GrievanceEscalationNotice';
import { GrievanceForm } from '@/components/support/grievance/GrievanceForm';
import { GrievanceOfficerCard } from '@/components/support/grievance/GrievanceOfficerCard';
import type { GrievanceValues } from '@/components/support/grievance/grievance.types';
import { submitGrievance, useGrievanceOfficer } from '@/hooks/useGrievance';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedTickets } from '@/hooks/useUnifiedTickets';

/**
 * Raise a grievance — the RN twin of mWeb's /support/grievance page.
 *
 * The screen states the escalation ladder before the form: support first, the
 * Grievance Officer only after support could not settle it. That is not advice
 * — a grievance with no support ticket behind it is rejected — so it is read
 * before any typing starts, and the form then asks which ticket is being
 * escalated.
 *
 * The reference number is what the person leaves with: on screen the moment
 * the grievance lands, in the email a second later, and the only thing they
 * can quote when they chase it.
 */
export function GrievanceScreen() {
  const { t } = useTranslation();
  const officer = useGrievanceOfficer();
  // The same list "All Support Tickets" shows — tickets, SOS, callbacks, chats.
  const { rows, isLoading: ticketsLoading } = useUnifiedTickets();
  const [sent, setSent] = useState<SubmittedGrievance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Built by the shared helper so the option this app stores and the one mWeb
  // stores are the same string (rule 40).
  const tickets = useMemo(() => grievanceSupportTicketOptions(rows), [rows]);

  const onSubmit = async (values: GrievanceValues) => {
    setSubmitting(true);
    setError('');
    try {
      setSent(await submitGrievance(values));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grievance.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StackScreen title={t('grievance.title')} testID="grievance-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <Text fontSize={13} color="$muted">
          {t('grievance.subtitle')}
        </Text>
        {sent ? (
          <YStack
            testID="grievance-sent"
            gap={6}
            padding={14}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={15} fontWeight="700" color="$color">
              {t('grievance.successTitle')}
            </Text>
            <Text fontSize={13} color="$muted">
              {t('grievance.successBody')}
            </Text>
            <Text fontSize={13} color="$muted">
              {t('grievance.referenceLabel')}
            </Text>
            <Text fontSize={18} fontWeight="700" color="$color" testID="grievance-reference">
              {sent.grievance_no}
            </Text>
            <Button borderRadius={12} onPress={() => setSent(null)}>
              {t('grievance.raiseAnother')}
            </Button>
          </YStack>
        ) : (
          <>
            <GrievanceEscalationNotice />
            <GrievanceForm
              submitting={submitting}
              errorMessage={error}
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              onSubmit={onSubmit}
            />
          </>
        )}
        <GrievanceOfficerCard officer={officer} />
      </ScrollView>
    </StackScreen>
  );
}
