import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SocialLinksField from '@/forms/fields/SocialLinksField';
import { SOCIAL_LINK_MAX, socialLinksSchema } from '@/forms/validation/socialLinks';
import type { CrmSocialLink } from '@/api/crm.types';
import { englishT } from '../helpers/englishT';

type Values = { social_links: CrmSocialLink[] };

function ValueProbe() {
  const links = useWatch<Values>({ name: 'social_links' });
  return <output data-testid="value">{JSON.stringify(links)}</output>;
}

const formSchema = () => z.object({ social_links: socialLinksSchema(englishT()) });

function Harness({ initial, schema }: Readonly<{ initial: CrmSocialLink[]; schema: ReturnType<typeof formSchema> }>) {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { social_links: initial },
  });
  return (
    <FormProvider {...methods}>
      <SocialLinksField />
      <ValueProbe />
    </FormProvider>
  );
}

const renderField = (initial: CrmSocialLink[] = []) => {
  // Built before rendering: the English translator comes from a hook render of its own.
  const schema = formSchema();
  return render(<Harness initial={initial} schema={schema} />);
};
const value = () => JSON.parse(screen.getByTestId('value').textContent ?? '[]') as CrmSocialLink[];
const addButton = () => screen.getByRole('button', { name: 'Add social link' });
const rows = () => screen.queryAllByTestId(/^social-link-row-/);

describe('SocialLinksField', () => {
  it('says there are no other links yet and offers to add one', () => {
    renderField();
    expect(screen.getByText('OTHER SOCIAL LINKS')).toBeInTheDocument();
    expect(screen.getByText('No other social links yet.')).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
    expect(addButton()).toBeEnabled();
  });

  it('adds an empty Name + Link row with the plus button and fills it in', () => {
    renderField();
    fireEvent.click(addButton());

    expect(screen.queryByText('No other social links yet.')).toBeNull();
    const row = within(rows()[0]);
    fireEvent.change(row.getByRole('textbox', { name: 'Name' }), { target: { value: 'YouTube' } });
    fireEvent.change(row.getByRole('textbox', { name: 'Link' }), { target: { value: 'https://youtube.com/@duncit' } });

    expect(value()).toEqual([{ name: 'YouTube', url: 'https://youtube.com/@duncit' }]);
  });

  it('shows the saved links and removes the one whose delete button is pressed', () => {
    renderField([
      { name: 'YouTube', url: 'https://youtube.com/@duncit' },
      { name: 'Facebook', url: 'https://facebook.com/duncit' },
    ]);
    expect(rows()).toHaveLength(2);
    expect(within(rows()[1]).getByRole('textbox', { name: 'Name' })).toHaveValue('Facebook');

    fireEvent.click(screen.getByRole('button', { name: 'Remove social link 1' }));

    expect(rows()).toHaveLength(1);
    expect(value()).toEqual([{ name: 'Facebook', url: 'https://facebook.com/duncit' }]);
    expect(within(rows()[0]).getByRole('textbox', { name: 'Name' })).toHaveValue('Facebook');
  });

  it('goes back to the empty message after the last row is removed', () => {
    renderField([{ name: 'YouTube', url: 'https://youtube.com/@duncit' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove social link 1' }));
    expect(screen.getByText('No other social links yet.')).toBeInTheDocument();
    expect(value()).toEqual([]);
  });

  it(`stops adding at ${SOCIAL_LINK_MAX} links`, () => {
    const almostFull = Array.from({ length: SOCIAL_LINK_MAX - 1 }, (_, i) => ({ name: `Link ${i}`, url: `https://example.com/${i}` }));
    renderField(almostFull);
    expect(addButton()).toBeEnabled();

    fireEvent.click(addButton());

    expect(rows()).toHaveLength(SOCIAL_LINK_MAX);
    expect(addButton()).toBeDisabled();
  });

  it('flags a link that is not a web address under that row, and clears it once fixed', async () => {
    renderField([{ name: 'X', url: '' }]);
    const link = within(rows()[0]).getByRole('textbox', { name: 'Link' });

    fireEvent.change(link, { target: { value: 'javascript:alert(1)' } });
    expect(await screen.findByText('Enter a full link starting with https://')).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(link, { target: { value: 'https://x.com/duncit' } });
    await waitFor(() => expect(screen.queryByText('Enter a full link starting with https://')).toBeNull());
    expect(link).toHaveAttribute('aria-invalid', 'false');
  });
});
