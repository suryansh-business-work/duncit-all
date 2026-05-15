import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { SuperCategoryGroup, SurveyCategory } from './signup-survey/SuperCategoryGroup';
import {
  MIN_PICKS,
  SAVE_INTERESTS,
  SURVEY_DATA,
  surveySchema,
} from './signup-survey/queries';
import SubmitFooter from './signup-survey/SubmitFooter';

export default function SignupSurveyPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(SURVEY_DATA, {
    fetchPolicy: 'cache-and-network',
  });
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
    <Stack
      spacing={2.5}
      sx={{
        maxWidth: 760,
        mx: 'auto',
        width: '100%',
        pb: 'calc(env(safe-area-inset-bottom) + 96px)',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          pt: 0.5,
          pb: 1,
          px: 0.25,
          backdropFilter: 'blur(10px)',
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 999,
            height: 6,
            overflow: 'hidden',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)',
            },
          }}
        />
      </Box>

      <Box>
        <Typography variant="h4" fontWeight={800}>
          What's your vibe? ✨
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pick at least {MIN_PICKS} interests across categories to find your tribe.
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ pb: 1 }}>
        {supers.map((superCategory) => (
          <SuperCategoryGroup
            key={superCategory.id}
            superCategory={superCategory}
            childrenByParent={childrenByParent}
            selected={selected}
            onToggle={toggle}
          />
        ))}
      </Stack>

      {opError && <Alert severity="error">{opError}</Alert>}

      <SubmitFooter
        count={count}
        total={total}
        saving={saving}
        canSubmit={canSubmit}
        onSubmit={submit}
      />
    </Stack>
  );
}
