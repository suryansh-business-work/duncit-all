import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { RequestEventSheet } from '@/forms/request-event';
import type { EventRequestTarget } from '@/generated/graphql/graphql';
import {
  MobileMyEventRequestStateDocument,
  MobileRequestEventDocument,
} from '@/graphql/event-request';
import { useSession } from '@/hooks/useSession';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';

type Target = `${EventRequestTarget}`;
type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  targetType: Target;
  targetId: string;
  targetName: string;
}

interface RequestState {
  is_owner: boolean;
  requested: boolean;
}

interface FrameProps {
  icon: IconName;
  title: string;
  hint: string;
  testID: string;
  children?: ReactNode;
}

/** An outlined row: icon, the lines, and the one action under them. */
function CardFrame({ icon, title, hint, testID, children }: Readonly<FrameProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      gap={12}
      padding={16}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={4}
      alignItems="flex-start"
    >
      <MaterialIcons
        name={icon}
        size={22}
        color={muted}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <YStack flex={1} gap={8} alignItems="flex-start">
        <Text role="heading" fontSize={15} fontWeight="700" color="$color">
          {title}
        </Text>
        <Text fontSize={14} color="$muted">
          {hint}
        </Text>
        {children}
      </YStack>
    </XStack>
  );
}

/**
 * Under a host's pods or a venue's Events when nothing is coming up: ask for an
 * event. Once asked it says so instead of offering a second request; on the
 * member's own venue or host page it is not shown. mWeb twin:
 * components/event-request/RequestEventCard.
 */
export function RequestEventCard({ targetType, targetId, targetName }: Readonly<Props>) {
  const { t } = useTranslation();
  const { isAuthenticated } = useSession();
  const [state, setState] = useState<RequestState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const variables = { target_type: targetType as EventRequestTarget, target_id: targetId };
  const testID = `request-event-${targetType.toLowerCase()}`;

  const load = useCallback(() => {
    setLoadFailed(false);
    graphqlRequest(
      MobileMyEventRequestStateDocument,
      { target_type: targetType as EventRequestTarget, target_id: targetId },
      { auth: true },
    )
      .then((data) => setState(data.myEventRequestState))
      .catch((error: unknown) => {
        logs.mobileApp.error('RequestEventCard', 'load', {
          error,
          target_type: targetType,
          target_id: targetId,
        });
        setLoadFailed(true);
      });
  }, [targetId, targetType]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const send = async (note: string): Promise<boolean> => {
    setSending(true);
    setSendError(null);
    try {
      const data = await graphqlRequest(
        MobileRequestEventDocument,
        { input: { ...variables, note } },
        { auth: true },
      );
      setState(data.requestEvent);
      setOpen(false);
      return true;
    } catch (error) {
      logs.mobileApp.error('RequestEventCard', 'send', {
        error,
        target_type: targetType,
        target_id: targetId,
      });
      setSendError(t('publicPage.eventRequest.failed'));
      return false;
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) return null;
  if (loadFailed) {
    return (
      <YStack testID={`${testID}-error`} gap={8} alignItems="flex-start">
        <Text role="alert" fontSize={14} color="$danger">
          {t('publicPage.eventRequest.loadFailed')}
        </Text>
        <DuncitButton label={t('publicPage.eventRequest.retry')} variant="outline" onPress={load} />
      </YStack>
    );
  }
  if (!state || state.is_owner) return null;
  if (state.requested) {
    return (
      <CardFrame
        icon="event-available"
        title={t('publicPage.eventRequest.requestedTitle')}
        hint={t('publicPage.eventRequest.requestedHint')}
        testID={`${testID}-requested`}
      />
    );
  }
  const hint =
    targetType === 'VENUE'
      ? t('publicPage.eventRequest.venueHint', { vars: { name: targetName } })
      : t('publicPage.eventRequest.hostHint', { vars: { name: targetName } });
  const body =
    targetType === 'VENUE'
      ? t('publicPage.eventRequest.dialogVenueBody', { vars: { name: targetName } })
      : t('publicPage.eventRequest.dialogHostBody', { vars: { name: targetName } });
  return (
    <CardFrame
      icon="event-note"
      title={t('publicPage.eventRequest.title')}
      hint={hint}
      testID={testID}
    >
      <DuncitButton
        testID={`${testID}-cta`}
        label={t('publicPage.eventRequest.cta')}
        onPress={() => setOpen(true)}
      />
      <RequestEventSheet
        open={open}
        body={body}
        sending={sending}
        error={sendError}
        onClose={() => setOpen(false)}
        onSubmit={send}
      />
    </CardFrame>
  );
}
