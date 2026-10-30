import { useEffect, useState } from 'react';
import { Box, Chip, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { TUTORIAL_LANGUAGE_OPTIONS, type TutorialFilters, type TutorialLanguageCode } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { LearningTopic } from './queries';

interface Props {
  filters: TutorialFilters;
  topics: LearningTopic[];
  onChange: (next: Partial<TutorialFilters>) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

/** Search, topic chips and the English / Hindi toggle above the Learnings reel. Native twin: TutorialFilterBar. */
export default function LearningsFilterBar({ filters, topics, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filters.search);
  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (search.trim() === filters.search) return undefined;
    const timer = setTimeout(() => onChange({ search: search.trim(), focus: '' }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filters.search, onChange]);

  const topicChip = (key: string, label: string) => {
    const selected = filters.topic === key;
    return (
      <Chip
        key={key || 'all'}
        data-testid={`learnings-topic-${key || 'all'}`}
        label={label}
        clickable
        color={selected ? 'primary' : 'default'}
        variant={selected ? 'filled' : 'outlined'}
        aria-pressed={selected}
        onClick={() => onChange({ topic: key, focus: '' })}
        sx={{ flexShrink: 0, fontWeight: 600 }}
      />
    );
  };

  return (
    <Stack spacing={1.25} data-testid="learnings-filters" sx={{ px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <TextField
        size="small"
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('mweb.tutorials.searchPlaceholder')}
        slotProps={{
          htmlInput: { 'aria-label': t('mweb.tutorials.searchLabel'), 'data-testid': 'learnings-search', type: 'search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label={t('mweb.tutorials.clearSearch')} onClick={() => setSearch('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
      <Box
        role="group"
        aria-label={t('mweb.tutorials.topicsLabel')}
        sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {topicChip('', t('mweb.tutorials.allTopics'))}
        {topics.map((topic) => topicChip(topic.key, topic.label))}
      </Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filters.language}
        aria-label={t('mweb.tutorials.languageLabel')}
        onChange={(_event, value: TutorialLanguageCode | '' | null) => onChange({ language: value ?? '', focus: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value="" data-testid="learnings-lang-all">
          {t('mweb.tutorials.allTopics')}
        </ToggleButton>
        {TUTORIAL_LANGUAGE_OPTIONS.map((option) => (
          <ToggleButton key={option.value} value={option.value} data-testid={`learnings-lang-${option.value}`}>
            {t(option.labelKey)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
