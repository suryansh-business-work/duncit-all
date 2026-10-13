import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AssignHostsField } from '@/components/create-pod/AssignHostsField';
import { renderWithProviders } from '@/utils/test-utils';

const asha = { user_id: 'h1', full_name: 'Asha Rao', email: 'asha@example.com' };
const ravi = { user_id: 'h2', full_name: 'Ravi Nair', email: '' };

const typeInSearch = (text: string) =>
  fireEvent.changeText(screen.getByTestId('create-pod-hosts-search'), text);

describe('AssignHostsField', () => {
  it('does not search until something is typed', () => {
    const search = jest.fn();
    renderWithProviders(<AssignHostsField hosts={[]} onChange={jest.fn()} search={search} />);
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByTestId('create-pod-host-h1')).toBeNull();
  });

  it('searches the trimmed term once typing pauses and lists the matches', async () => {
    const search = jest.fn().mockResolvedValue([asha, ravi]);
    renderWithProviders(<AssignHostsField hosts={[]} onChange={jest.fn()} search={search} />);
    typeInSearch('  as  ');
    await waitFor(() => expect(search).toHaveBeenCalledWith('as'));
    await waitFor(() => expect(screen.getByTestId('create-pod-host-h1')).toBeOnTheScreen());
    expect(screen.getByText('asha@example.com')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-host-h2')).toBeOnTheScreen();
  });

  it('adds a picked host, clears the box and the results', async () => {
    const onChange = jest.fn();
    const search = jest.fn().mockResolvedValue([asha]);
    renderWithProviders(<AssignHostsField hosts={[ravi]} onChange={onChange} search={search} />);
    typeInSearch('as');
    await waitFor(() => expect(screen.getByTestId('create-pod-host-h1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('create-pod-host-h1'));
    expect(onChange).toHaveBeenCalledWith([ravi, asha]);
    expect(screen.queryByTestId('create-pod-host-h1')).toBeNull();
    expect(screen.getByTestId('create-pod-hosts-search').props.value).toBe('');
  });

  it('does not offer a host who is already assigned', async () => {
    const search = jest.fn().mockResolvedValue([asha, ravi]);
    renderWithProviders(<AssignHostsField hosts={[asha]} onChange={jest.fn()} search={search} />);
    typeInSearch('a');
    await waitFor(() => expect(screen.getByTestId('create-pod-host-h2')).toBeOnTheScreen());
    expect(screen.queryByTestId('create-pod-host-h1')).toBeNull();
    // The assigned one is shown as a removable chip instead.
    expect(screen.getByTestId('create-pod-host-chip-h1')).toBeOnTheScreen();
  });

  it('removes an assigned host from its chip', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <AssignHostsField hosts={[asha, ravi]} onChange={onChange} search={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('create-pod-host-chip-h1'));
    expect(onChange).toHaveBeenCalledWith([ravi]);
  });

  it('shows no results when the search fails', async () => {
    const search = jest.fn().mockRejectedValue(new Error('down'));
    renderWithProviders(<AssignHostsField hosts={[]} onChange={jest.fn()} search={search} />);
    typeInSearch('as');
    await waitFor(() => expect(search).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('create-pod-hosts-searching')).toBeNull());
    expect(screen.queryByTestId('create-pod-host-h1')).toBeNull();
  });

  it('clears the results when the box is emptied', async () => {
    const search = jest.fn().mockResolvedValue([asha]);
    renderWithProviders(<AssignHostsField hosts={[]} onChange={jest.fn()} search={search} />);
    typeInSearch('as');
    await waitFor(() => expect(screen.getByTestId('create-pod-host-h1')).toBeOnTheScreen());
    typeInSearch('');
    await waitFor(() => expect(screen.getByTestId('create-pod-hosts-search').props.value).toBe(''));
    await waitFor(() => expect(screen.queryByTestId('create-pod-host-h1')).toBeNull(), {
      timeout: 3000,
    });
  });
});
