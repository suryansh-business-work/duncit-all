import { useEffect, useState } from 'react';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { LeaderboardCategory, LeaderboardPeriodKey } from '@duncit/utils';
import type {
  LeaderboardCategory as GqlLeaderboardCategory,
  LeaderboardPeriod as GqlLeaderboardPeriod,
} from '@/generated/graphql/graphql';
import { StackScreen } from '@/components/StackScreen';
import {
  LeaderboardBoardList,
  LeaderboardCategoryTabs,
  LeaderboardHowToEarn,
  LeaderboardPeriodToggle,
  LeaderboardRewards,
  LeaderboardYourPoints,
} from '@/components/leaderboard';
import {
  MobileLeaderboardBoardDocument,
  MobileLeaderboardConfigDocument,
} from '@/graphql/leaderboard';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';

type BoardData = ResultOf<typeof MobileLeaderboardBoardDocument>['leaderboard'];
type ConfigData = ResultOf<typeof MobileLeaderboardConfigDocument>['leaderboardConfig'];

/**
 * The Leaderboard — five boards (Users, Hosts, Club Admins, Venues, Brands),
 * a period toggle, the caller's own standing up top, then how points are
 * earned and what finishing well pays. RN twin of mWeb's LeaderboardPage
 * (rule 27); reached only through the flag-gated sidebar section.
 */
export function LeaderboardScreen() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<LeaderboardCategory>('USER');
  const [period, setPeriod] = useState<LeaderboardPeriodKey>('MONTH');
  const [board, setBoard] = useState<BoardData | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    graphqlRequest(
      MobileLeaderboardBoardDocument,
      {
        // The generated enums share these exact string values (AdSlot precedent).
        category: category as GqlLeaderboardCategory,
        period: period as GqlLeaderboardPeriod,
      },
      { auth: true },
    )
      .then((data) => active && setBoard(data.leaderboard))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [category, period]);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileLeaderboardConfigDocument)
      .then((data) => active && setConfig(data.leaderboardConfig))
      .catch(() => {
        // Reference data — without it the earn/reward cards simply stay off.
      });
    return () => {
      active = false;
    };
  }, []);

  let boardBody;
  if (hasError) {
    boardBody = (
      <Text testID="leaderboard-error" paddingHorizontal={16} fontSize={13} color="$danger">
        {t('mweb.leaderboard.loadError')}
      </Text>
    );
  } else if (isLoading && !board) {
    boardBody = (
      <YStack alignItems="center" paddingVertical={32} testID="leaderboard-loading">
        <Spinner size="large" />
      </YStack>
    );
  } else {
    boardBody = <LeaderboardBoardList rows={board?.rows ?? []} />;
  }

  return (
    <StackScreen title={t('mweb.leaderboard.title')} testID="leaderboard-screen">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap={14} paddingVertical={12}>
          <LeaderboardCategoryTabs value={category} onChange={setCategory} />
          <LeaderboardYourPoints board={board} isLoading={isLoading} />
          <LeaderboardPeriodToggle value={period} onChange={setPeriod} />
          {boardBody}
          {config ? <LeaderboardHowToEarn config={config} /> : null}
          {config ? <LeaderboardRewards config={config} category={category} /> : null}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
