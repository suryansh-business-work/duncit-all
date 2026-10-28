import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarAndVisibility, CoverField, DescriptionField, TitleInput } from '../../../../pages/event-form/luma/FormHeadFields';
import { renderInEventForm } from '../helpers';

describe('TitleInput', () => {
  it('is a large textbox named Title with the event’s name', () => {
    renderInEventForm(<TitleInput />);
    const title = screen.getByRole('textbox', { name: 'Title' });
    expect(title).toHaveValue('Rooftop Jam');
    expect(title).toHaveAttribute('placeholder', 'Event name');
    expect(title).toHaveAttribute('maxlength', '120');
  });

  it('announces a missing title and ties the message to the box', async () => {
    const { user, form } = renderInEventForm(<TitleInput />);
    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(title);
    await act(async () => {
      await form().trigger('title');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('This is required');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('This is required');
  });

  it('writes what is typed into the form', async () => {
    const { user, form } = renderInEventForm(<TitleInput />, { defaults: { title: '' } });
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Sunday Picnic');
    expect(form().getValues('title')).toBe('Sunday Picnic');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('DescriptionField', () => {
  it('sits in a region named Description with its hint', async () => {
    const { user, form } = renderInEventForm(<DescriptionField />, { defaults: { description: '' } });
    const region = screen.getByRole('region', { name: 'Description' });
    expect(region).toContainElement(screen.getByRole('textbox', { name: 'Description' }));
    expect(screen.getByText('Blank lines become paragraphs')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Bring water.');
    expect(form().getValues('description')).toBe('Bring water.');
  });
});

describe('CalendarAndVisibility', () => {
  const calendars = [{ value: 'cal-1', label: 'Run Club' }];

  it('files the event under the personal calendar until one is picked', async () => {
    const { user, form } = renderInEventForm(<CalendarAndVisibility calendars={calendars} />);
    await user.click(screen.getByTestId('event-calendar'));
    expect(screen.getByRole('option', { name: 'Personal calendar' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'Run Club' }));
    expect(form().getValues('calendar_id')).toBe('cal-1');
  });

  it('offers public, unlisted and private, public first', async () => {
    const { user, form } = renderInEventForm(<CalendarAndVisibility calendars={[]} />);
    expect(screen.getByTestId('event-visibility')).toHaveTextContent('Public');
    await user.click(screen.getByTestId('event-visibility'));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Public', 'Unlisted', 'Private']);
    await user.click(screen.getByRole('option', { name: 'Unlisted' }));
    expect(form().getValues('visibility')).toBe('UNLISTED');
  });
});

describe('CoverField', () => {
  it('previews the cover the form holds and clears it with Remove picture', async () => {
    const { user, form } = renderInEventForm(<CoverField />, { defaults: { cover_url: 'https://pictures.example/roof.jpg' } });
    expect(screen.getByTestId('event-cover-preview')).toHaveAttribute('src', 'https://pictures.example/roof.jpg');
    expect(screen.getByRole('button', { name: 'Change picture' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove picture' }));
    expect(form().getValues('cover_url')).toBe('');
    expect(screen.queryByTestId('event-cover-preview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a picture' })).toBeInTheDocument();
  });

  it('shows the link problem in place of the hint', async () => {
    const { form } = renderInEventForm(<CoverField />, { defaults: { cover_url: 'roof.jpg' } });
    expect(screen.getByText('Wide pictures look best')).toBeInTheDocument();
    await act(async () => {
      await form().trigger('cover_url');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a full link starting with http:// or https://');
    expect(screen.queryByText('Wide pictures look best')).not.toBeInTheDocument();
  });
});
