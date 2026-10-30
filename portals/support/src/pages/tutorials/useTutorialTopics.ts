import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { TUTORIAL_TOPICS, type TutorialTopicsData } from './queries';

export interface TopicOption {
  value: string;
  label: string;
}

/** Every topic (hidden ones too) as select/filter options keyed by topic key. */
export function useTutorialTopics() {
  const { data, error, refetch } = useQuery<TutorialTopicsData>(TUTORIAL_TOPICS, {
    fetchPolicy: 'cache-and-network',
  });
  const options = useMemo<TopicOption[]>(
    () => (data?.tutorialTopics ?? []).map((topic) => ({ value: topic.key, label: topic.label })),
    [data],
  );
  const labelOf = useMemo(() => {
    const byKey = new Map(options.map((option) => [option.value, option.label]));
    return (key: string) => byKey.get(key) ?? key;
  }, [options]);
  return { options, labelOf, error, refetch };
}
