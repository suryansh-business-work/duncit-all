import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { CAPTCHA_FALLBACK_COPY } from '@duncit/i18n';
import CaptchaField from '../src/mui/CaptchaField';
import type { CaptchaState } from '../src/mui/useCaptcha';

const IMAGE = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

const state = (over: Partial<CaptchaState> = {}): CaptchaState => ({
  token: 'cap_7f3a91',
  image: IMAGE,
  loading: false,
  failed: false,
  reload: vi.fn(),
  ...over,
});

interface Values {
  captcha_answer: string;
}

function Host({ captcha }: Readonly<{ captcha: CaptchaState }>) {
  const { control } = useForm<Values>({ defaultValues: { captcha_answer: '' } });
  return (
    <CaptchaField
      control={control}
      name="captcha_answer"
      captcha={captcha}
      copy={CAPTCHA_FALLBACK_COPY}
    />
  );
}

describe('CaptchaField', () => {
  it('shows the picture the server drew, described for a reader who cannot see it', () => {
    render(<Host captcha={state()} />);

    const image = screen.getByAltText(CAPTCHA_FALLBACK_COPY.imageAlt);
    expect(image).toHaveAttribute('src', IMAGE);
    expect(screen.getByText(CAPTCHA_FALLBACK_COPY.title)).toBeInTheDocument();
    expect(screen.getByText(CAPTCHA_FALLBACK_COPY.hint)).toBeInTheDocument();
  });

  it('holds the frame with a placeholder while there is no picture yet', () => {
    render(<Host captcha={state({ image: '', loading: true })} />);

    expect(screen.queryByAltText(CAPTCHA_FALLBACK_COPY.imageAlt)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: CAPTCHA_FALLBACK_COPY.refresh })).toBeDisabled();
  });

  // A blank frame with the ordinary hint under it reads as a bug rather than
  // as an API that could not be reached.
  it('says the check is unavailable instead of the hint once the fetch has failed', () => {
    render(<Host captcha={state({ image: '', failed: true })} />);

    expect(screen.getByText(CAPTCHA_FALLBACK_COPY.unavailable)).toBeInTheDocument();
    expect(screen.queryByText(CAPTCHA_FALLBACK_COPY.hint)).not.toBeInTheDocument();
  });

  it('asks for a fresh code when the refresh is pressed', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    render(<Host captcha={state({ reload })} />);

    await user.click(screen.getByRole('button', { name: CAPTCHA_FALLBACK_COPY.refresh }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('writes what the visitor types into the form field, and only that', async () => {
    const user = userEvent.setup();
    render(<Host captcha={state()} />);

    const box = screen.getByLabelText(CAPTCHA_FALLBACK_COPY.label);
    await user.type(box, '4kp9m');

    expect(box).toHaveValue('4kp9m');
    expect(box).toHaveAttribute('maxlength', '8');
  });
});
