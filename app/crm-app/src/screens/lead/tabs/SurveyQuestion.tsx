import { MaterialIcons } from '@expo/vector-icons';
import { Input, Label, Text, TextArea, XStack, YStack, useTheme } from 'tamagui';
import { crmToggleSurveyOption, type CrmSurveyFieldAnswer } from '@duncit/utils';

import type { LeadSurveyDef } from './SurveyState';

type Question = LeadSurveyDef['questions'][number];

interface Props {
  question: Question;
  answer: CrmSurveyFieldAnswer;
  onChange: (next: CrmSurveyFieldAnswer) => void;
}

/** One option as a radio or a tick box, the whole row tappable. */
function OptionRow({
  label,
  checked,
  multi,
  onPress,
  testID,
}: Readonly<{
  label: string;
  checked: boolean;
  multi: boolean;
  onPress: () => void;
  testID: string;
}>) {
  const theme = useTheme();
  let icon:
    'check-box' | 'check-box-outline-blank' | 'radio-button-checked' | 'radio-button-unchecked';
  if (multi) icon = checked ? 'check-box' : 'check-box-outline-blank';
  else icon = checked ? 'radio-button-checked' : 'radio-button-unchecked';
  return (
    <XStack
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={checked}
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap="$2"
      minHeight={44}
      testID={testID}
    >
      <MaterialIcons
        name={icon}
        size={22}
        color={checked ? theme.accentText?.val : theme.muted?.val}
      />
      <Text flex={1}>{label}</Text>
    </XStack>
  );
}

/** A survey question's input: a line, a paragraph, or its options (one, or several). */
export function SurveyQuestion({ question: q, answer, onChange }: Readonly<Props>) {
  const id = `survey-${q.qid}`;
  const text = {
    id,
    value: answer.value,
    onChangeText: (value: string) => onChange({ ...answer, value }),
    'aria-label': q.label,
    placeholderTextColor: '$muted',
    borderColor: '$inputBorder',
    testID: id,
  } as const;
  return (
    <YStack gap="$1" role={q.type === 'MCQ' ? 'radiogroup' : undefined} aria-label={q.label}>
      <Label htmlFor={id} fontWeight="700">
        {q.required ? `${q.label} *` : q.label}
      </Label>
      {q.help ? (
        <Text color="$muted" fontSize="$2">
          {q.help}
        </Text>
      ) : null}
      {q.type === 'TEXT' ? <Input {...text} /> : null}
      {q.type === 'TEXTAREA' ? <TextArea {...text} minHeight={96} /> : null}
      {q.type === 'MCQ'
        ? q.options.map((option) => (
            <OptionRow
              key={option}
              label={option}
              multi={q.multi}
              checked={q.multi ? answer.values.includes(option) : answer.value === option}
              onPress={() =>
                onChange(
                  q.multi ? crmToggleSurveyOption(answer, option) : { ...answer, value: option },
                )
              }
              testID={`${id}-${option}`}
            />
          ))
        : null}
    </YStack>
  );
}
