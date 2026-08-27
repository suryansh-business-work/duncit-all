import { Box, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton, PRESS, pressCss } from '@duncit/buttons';
import { defineDemo, defineDemos } from '../types';

type MuiVariant = 'contained' | 'outlined' | 'text';

interface ButtonMock {
  label: string;
  variant: MuiVariant;
  color: 'primary' | 'secondary' | 'error' | 'success';
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
  loading: boolean;
}

export default defineDemos('buttons', [
  defineDemo<ButtonMock>({
    id: 'states',
    title: 'Every state a button has — hold one down',
    note: 'Press and HOLD a button: it compresses and darkens, instantly, and eases back on release. That beat is what this package exists for — before it, only a contained primary button had any pressed state at all, in the whole of mWeb and all 17 portals. Flip `disabled` and `loading` to see why they are separate: a disabled button recedes, a loading one keeps its colour because it is still the thing you just pressed.',
    mock: {
      label: 'Complete pod DUN-POD-4821',
      variant: 'contained',
      color: 'primary',
      size: 'medium',
      disabled: false,
      loading: false,
    },
    render: (mock) => <ButtonStage mock={mock} />,
    compute: (mock) => ({
      'Intent this variant answers to': INTENT_BY_VARIANT[mock.variant],
      'The recipe behind it': PRESS[INTENT_BY_VARIANT[mock.variant]],
      'CSS it produces': pressCss(INTENT_BY_VARIANT[mock.variant], {
        ink: '#111827',
        accent: '#ff5757',
      }),
      'Why contained never dims':
        'Dropping the opacity of a filled button over a light page makes it LIGHTER, which reads as the button going away rather than going down. It darkens its own fill instead — and so does its Tamagui twin in the app.',
    }),
  }),
]);

const INTENT_BY_VARIANT = {
  contained: 'solid',
  outlined: 'control',
  text: 'ghost',
} as const;

/** Hoisted: a component defined inside `render` remounts on every keystroke. */
function ButtonStage({ mock }: Readonly<{ mock: ButtonMock }>) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton
          variant={mock.variant}
          color={mock.color}
          size={mock.size}
          disabled={mock.disabled}
          loading={mock.loading}
        >
          {mock.label}
        </DuncitButton>
        <DuncitIconButton color={mock.color} size={mock.size} disabled={mock.disabled}>
          <DeleteIcon fontSize="inherit" />
        </DuncitIconButton>
      </Stack>
      <Box>
        <Typography variant="body2">
          All three variants at once — each takes a different intent, because a filled button, an
          outlined one and a text one cannot press the same way:
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <DuncitButton variant="contained">Contained · solid</DuncitButton>
          <DuncitButton variant="outlined">Outlined · control</DuncitButton>
          <DuncitButton variant="text">Text · ghost</DuncitButton>
        </Stack>
      </Box>
    </Stack>
  );
}
