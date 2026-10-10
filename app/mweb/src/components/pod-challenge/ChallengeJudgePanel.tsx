import { useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError, notifySuccess } from '../notify';
import { parseConfig } from './challengeView';
import { JudgeSheetForm, type JudgeCriterion, type JudgeSheetValues } from './judge-sheet-form';
import { JUDGE_POD_CHALLENGE_COMPETITOR, type PodChallengeView } from './queries';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'competitors'>;
  tool: PodChallengeView['tools'][number];
}

/** An assigned judge's score sheet: one competitor at a time, every criterion marked. */
export default function ChallengeJudgePanel({ challenge, tool }: Readonly<Props>) {
  const { t } = useTranslation();
  const criteria = useMemo(
    () => (parseConfig(tool.config_json).criteria as JudgeCriterion[] | undefined) ?? [],
    [tool.config_json]
  );
  const [judge, judgeState] = useMutation(JUDGE_POD_CHALLENGE_COMPETITOR);

  const submit = async (values: JudgeSheetValues): Promise<boolean> => {
    try {
      await judge({
        variables: {
          id: challenge.id,
          toolInstanceId: tool.instance_id,
          candidateId: values.candidate_id,
          scores: criteria.map((c) => ({ key: c.key, value: values.marks[c.key] })),
        },
      });
      notifySuccess(t('mweb.challenge.judgeSaved'));
      return true;
    } catch (error) {
      notifyError((error as Error).message);
      return false;
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <GavelIcon color="primary" />
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
              {tool.label}
            </Typography>
          </Stack>
          <JudgeSheetForm criteria={criteria} competitors={challenge.competitors} saving={judgeState.loading} onSubmit={submit} />
        </Stack>
      </CardContent>
    </Card>
  );
}
