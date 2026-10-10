import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { parseJsonObject } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import {
  judgeSheetInitialValues,
  makeJudgeSheetSchema,
  type JudgeCriterion,
  type JudgeSheetValues,
} from '@/forms/challenge';
import { JudgePodChallengeCompetitorDocument } from '@/graphql/challenges';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'competitors'>;
  tool: PodChallengeView['tools'][number];
  onChanged: (next: PodChallengeView) => void;
}

/** An assigned judge's score sheet — the Tamagui twin of mWeb's ChallengeJudgePanel (rule 27). */
export function ChallengeJudgeSheet({ challenge, tool, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const criteria = useMemo(
    () => (parseJsonObject(tool.config_json).criteria as JudgeCriterion[] | undefined) ?? [],
    [tool.config_json],
  );
  const first = challenge.competitors[0]?.competitor_id ?? '';
  const { control, handleSubmit, reset } = useForm<JudgeSheetValues, unknown, JudgeSheetValues>({
    resolver: formResolver<JudgeSheetValues>(makeJudgeSheetSchema(t, criteria)),
    defaultValues: judgeSheetInitialValues(first, criteria),
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      const res = await graphqlRequest(
        JudgePodChallengeCompetitorDocument,
        {
          id: challenge.id,
          toolInstanceId: tool.instance_id,
          candidateId: values.candidate_id,
          scores: criteria.map((c) => ({ key: c.key, value: Number(values.marks[c.key]) })),
        },
        { auth: true },
      );
      onChanged(res.judgePodChallengeCompetitor);
      reset(judgeSheetInitialValues(values.candidate_id, criteria));
      setNotice({ tone: 'success', text: t('mweb.challenge.judgeSaved') });
    } catch (e) {
      setNotice({ tone: 'danger', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  });

  return (
    <SurfaceCard gap={10} testID={`challenge-judge-${tool.instance_id}`}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="gavel" size={20} color={colors.primary} />
        <Text fontSize={16} fontWeight="700" color="$color" role="heading">
          {tool.label}
        </Text>
      </XStack>
      {notice ? <NoticeCard tone={notice.tone} title={notice.text} /> : null}
      <Controller
        control={control}
        name="candidate_id"
        render={({ field }) => (
          <XStack
            gap={6}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t('mweb.challenge.judgeCompetitor')}
          >
            {challenge.competitors.map((c) => (
              <MediumToggle
                key={c.competitor_id}
                label={c.name}
                selected={field.value === c.competitor_id}
                onPress={() => field.onChange(c.competitor_id)}
              />
            ))}
          </XStack>
        )}
      />
      {criteria.map((c) => (
        <FormTextField
          key={c.key}
          control={control}
          name={`marks.${c.key}`}
          label={t('mweb.challenge.criterionOutOf', { vars: { label: c.label, max: c.max } })}
          keyboardType="decimal-pad"
          required
        />
      ))}
      <DuncitButton
        label={t('mweb.challenge.submitScores')}
        loading={busy}
        disabled={busy}
        onPress={() => {
          submit().catch(() => undefined);
        }}
        testID={`challenge-judge-submit-${tool.instance_id}`}
        fullWidth
      />
    </SurfaceCard>
  );
}
