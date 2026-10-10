import { Text, YStack } from 'tamagui';
import { buzzOrder, buzzRoundScope, pickedCompetitors } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ToolCard, ToolNote, type PanelProps } from './ToolCard';

/**
 * The buzzer — the Tamagui twin of mWeb's ChallengeBuzzerPanel (rule 27). A
 * press is timed by the server, so a slow phone or a wrong clock cannot jump
 * the queue; the order shown is the server's.
 */
export function BuzzerPanel({ challenge, tool, actions }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  const order = buzzOrder(tool);
  const scope = buzzRoundScope(tool);
  const buzzed = challenge.viewer.my_votes.some(
    (v) => v.tool_instance_id === tool.instance_id && v.kind === 'BUZZ' && v.scope_key === scope,
  );
  const competing = !!challenge.viewer.my_competitor_id;

  return (
    <ToolCard
      icon="notifications-active"
      title={tool.label}
      testID={`challenge-buzzer-${tool.instance_id}`}
    >
      <ToolNote>
        {t(
          tool.voting_open ? 'mweb.challenge.tools.buzzArmed' : 'mweb.challenge.tools.buzzWaiting',
        )}
      </ToolNote>
      {competing ? (
        <DuncitButton
          tone="danger"
          disabled={!tool.voting_open || buzzed || actions.busy}
          label={t(buzzed ? 'mweb.challenge.tools.buzzed' : 'mweb.challenge.tools.buzz')}
          onPress={() => fireAndForget(actions.buzz(tool.instance_id))}
          testID={`challenge-buzz-${tool.instance_id}`}
          fullWidth
        />
      ) : (
        <ToolNote>{t('mweb.challenge.tools.competitorsOnly')}</ToolNote>
      )}
      {order.length > 0 ? (
        <YStack
          role="list"
          aria-label={t('mweb.challenge.tools.buzzOrder')}
          aria-live="polite"
          gap={4}
        >
          {order.map((competitorId, index) => (
            <Text
              key={competitorId}
              role="listitem"
              fontSize={15}
              fontWeight={index === 0 ? '800' : '400'}
              color="$color"
            >
              {t('mweb.challenge.tools.place', {
                vars: { place: index + 1, name: names.get(competitorId) ?? '' },
              })}
            </Text>
          ))}
        </YStack>
      ) : (
        <ToolNote>{t('mweb.challenge.tools.buzzNobody')}</ToolNote>
      )}
    </ToolCard>
  );
}

/** The Random Picker's draws. The server draws; every screen shows the same pick. */
export function PickPanel({ challenge, tool }: Readonly<Pick<PanelProps, 'challenge' | 'tool'>>) {
  const { t } = useTranslation();
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  // Numbered in draw order: the same competitor can be drawn twice, and the
  // number is what tells the two draws apart.
  const draws = pickedCompetitors(tool).map((id, index) => ({
    place: index + 1,
    name: names.get(id) ?? '',
  }));
  const latest = draws.at(-1);
  const earlier = draws.slice(0, -1);

  return (
    <ToolCard icon="casino" title={tool.label} testID={`challenge-pick-${tool.instance_id}`}>
      {latest ? (
        <Text fontSize={22} fontWeight="800" color="$color" aria-live="polite">
          {t('mweb.challenge.tools.pickLatest', { vars: { name: latest.name } })}
        </Text>
      ) : (
        <ToolNote>{t('mweb.challenge.tools.pickNone')}</ToolNote>
      )}
      {earlier.length > 0 && (
        <YStack gap={4}>
          <ToolNote>{t('mweb.challenge.tools.pickEarlier')}</ToolNote>
          {earlier.map((draw) => (
            <Text key={draw.place} fontSize={14} color="$color">
              {t('mweb.challenge.tools.place', { vars: draw })}
            </Text>
          ))}
        </YStack>
      )}
    </ToolCard>
  );
}
