import { Box, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DuncitButton,
  DuncitIconButton,
  DuncitRoundButton,
  PRESS,
  pressCss,
  type RoundButtonTone,
} from '@duncit/buttons';
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
  defineDemo<RoundMock>({
    id: 'round-close',
    title: 'The close button that stays a circle',
    note: "Every close control in mWeb is this shape. Shrink `thumbnail` below the badge's own diameter, or grow `label` until the row runs out of width: the circle stays a circle and the cross stays in the middle of it. A plain DuncitIconButton with a pinned width squashes the icon on the main axis and spills it over the top and bottom edge — which is what the 24px remove badges over pod media were doing.",
    mock: {
      label: 'Sunday Sketch Meetup · DUN-POD-4821',
      tone: 'overlay',
      thumbnail: 88,
    },
    render: (mock) => <RoundStage mock={mock} />,
  }),
]);

interface RoundMock {
  label: string;
  tone: RoundButtonTone;
  thumbnail: number;
}

/** Hoisted for the same reason as `ButtonStage`. */
function RoundStage({ mock }: Readonly<{ mock: RoundMock }>) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {(['small', 'medium', 'large'] as const).map((size) => (
          <DuncitRoundButton key={size} size={size} tone={mock.tone} aria-label={`Close ${size}`}>
            <CloseIcon />
          </DuncitRoundButton>
        ))}
        <Typography variant="body2" noWrap>
          24px · 36px · 44px
        </Typography>
      </Stack>
      <Box
        sx={{
          position: 'relative',
          width: mock.thumbnail,
          height: mock.thumbnail,
          borderRadius: '16px',
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <DuncitRoundButton
          size="small"
          tone={mock.tone}
          aria-label="Remove pod media"
          sx={{ position: 'absolute', top: 2, right: 2 }}
        >
          <CloseIcon />
        </DuncitRoundButton>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {mock.label}
        </Typography>
        <DuncitRoundButton tone={mock.tone} aria-label="Close sheet">
          <CloseIcon />
        </DuncitRoundButton>
      </Stack>
    </Stack>
  );
}

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
