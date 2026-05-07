import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { SuperCategoryGroup, SurveyCategory } from './signup-survey/SuperCategoryGroup';

const SURVEY_DATA = gql`
  query SignupSurveyData {
    me {
      user_id
      interest_category_ids
    }
    categoryTree {
      id
      name
      icon
      level
      parent_id
      is_active
    }
  }
`;

const SAVE_INTERESTS = gql`
  mutation SaveInterests($category_ids: [ID!]!) {
    updateMyInterests(category_ids: $category_ids) {
      user_id
      onboarding_survey_completed
      interest_category_ids
    }
  }
`;

const MIN_PICKS = 3;

const surveySchema = yup.object({
  category_ids: yup
    .array()
    .of(yup.string().required())
    .min(MIN_PICKS, `Pick at least ${MIN_PICKS} interests to find your tribe`)
    .required(),
});

export default function SignupSurveyPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(SURVEY_DATA, { fetchPolicy: 'cache-and-network' });
  const [saveInterests, { loading: saving }] = useMutation(SAVE_INTERESTS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(data?.me?.interest_category_ids ?? []));
  }, [data?.me?.interest_category_ids]);

  const tree: SurveyCategory[] = data?.categoryTree ?? [];

  const { supers, childrenByParent, total, superIds } = useMemo(() => {
    const map = new Map<string | null, SurveyCategory[]>();
    const active = tree.filter((c: any) => c.is_active);
    active.forEach((c: SurveyCategory) => {
      const key = c.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), c]);
    });
    const supersArr = map.get(null) ?? [];
    return {
      supers: supersArr,
      childrenByParent: map,
      total: active.length - supersArr.length,
      superIds: new Set(supersArr.map((s) => s.id)),
    };
  }, [tree]);

  // Strip any super-category ids from the previously-saved selection so they
  // don't count toward the picks count (super categories are not selectable).
  useEffect(() => {
    if (!superIds.size) return;
    setSelected((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (superIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [superIds]);

  const toggle = (id: string) => {
    if (superIds.has(id)) return;
    setOpError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setOpError(null);
    const category_ids = Array.from(selected);
    try {
      await surveySchema.validate({ category_ids }, { abortEarly: false });
      await saveInterests({ variables: { category_ids } });
      navigate('/');
    } catch (e: any) {
      setOpError(e?.errors?.[0] ?? e.message ?? 'Could not save your interests');
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const count = selected.size;
  const progress = Math.min(100, Math.round((count / Math.max(MIN_PICKS, 1)) * 100));
  const canSubmit = count >= MIN_PICKS && !saving;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%', pb: 'calc(env(safe-area-inset-bottom) + 180px)' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 5, bgcolor: 'background.default', pt: 1, pb: 1.5 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 999, height: 8 }} />
      </Box>

      <Box>
        <Typography variant="h4" fontWeight={800}>
          What's your vibe? ✨
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pick at least {MIN_PICKS} interests across categories to find your tribe.
        </Typography>
      </Box>

      {supers.map((superCategory) => (
        <SuperCategoryGroup
          key={superCategory.id}
          superCategory={superCategory}
          childrenByParent={childrenByParent}
          selected={selected}
          onToggle={toggle}
        />
      ))}

      {opError && <Alert severity="error">{opError}</Alert>}

      <Box
        sx={{
          position: 'fixed',
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          zIndex: 10,
          px: 2,
          py: 1.5,
          backdropFilter: 'blur(12px)',
          bgcolor: (t) => `${t.palette.background.paper}cc`,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Selected
            </Typography>
            <Typography variant="subtitle1" fontWeight={800}>
              {count}
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {' '}
                / {total}
              </Box>
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            disabled={!canSubmit}
            onClick={submit}
            sx={{ minWidth: 160, fontWeight: 800 }}
          >
            {saving ? 'Saving…' : "Let's Go!"}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
