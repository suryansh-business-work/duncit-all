import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ChallengeFormDialog from '../../src/pages/challenges/ChallengeFormDialog';
import { CREATE_CHALLENGE } from '../../src/graphql/challenges';
import type { TemplateFormProps, TemplateFormValues } from '../../src/components/template-form';
import { renderWithProviders } from '../testkit';
import {
  challengeToolPresetsMock,
  challengeToolsMock,
  makeChallenge,
  makePreset,
  makeTool,
} from '../mocks';

const useMutationMock = vi.hoisted(() => vi.fn());
/** What the stand-in form submits; null submits the values it was given. */
const submitted = vi.hoisted(() => ({ values: null as unknown }));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useMutation: useMutationMock,
}));

// The form has its own fields, schema and suite. Here it is a window onto what
// the dialog hands it, and a way to hand values back — the dialog's two jobs.
vi.mock('../../src/components/template-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/components/template-form')>()),
  TemplateForm: ({ values, tools, presets, saving, onSubmit, onCancel }: TemplateFormProps) => (
    <div>
      <output data-testid="form-values">{JSON.stringify(values)}</output>
      <output data-testid="form-tools">{tools.map((tool) => tool.id).join(',')}</output>
      <output data-testid="form-presets">{presets.map((preset) => preset.id).join(',')}</output>
      <output data-testid="form-saving">{String(saving)}</output>
      <button type="button" onClick={() => onSubmit((submitted.values as TemplateFormValues | null) ?? values)}>
        form-submit
      </button>
      <button type="button" onClick={onCancel}>
        form-cancel
      </button>
    </div>
  ),
}));

const createFn = vi.fn();
const updateFn = vi.fn();
let createState: { loading: boolean; error?: { message: string } };
let updateState: { loading: boolean; error?: { message: string } };

const wireMutations = () => {
  useMutationMock.mockImplementation((doc: unknown) =>
    doc === CREATE_CHALLENGE ? [createFn, createState] : [updateFn, updateState],
  );
};

// One tool with a schema, so stored settings are completed from its defaults.
const scoreTool = makeTool({
  id: 'tool-1',
  config_schema_json: JSON.stringify([
    { key: 'max_score', kind: 'number', default: 10 },
    { key: 'allow_negative', kind: 'boolean', default: false },
  ]),
});
const engineMocks = (delay?: number) => [
  challengeToolsMock([scoreTool], { delay }),
  challengeToolPresetsMock([makePreset({ id: 'preset-1', tool_id: 'tool-1' })]),
];

const formValues = async (): Promise<TemplateFormValues> =>
  JSON.parse((await screen.findByTestId('form-values')).textContent ?? '{}') as TemplateFormValues;

const scoped = makeChallenge({
  id: 'ch1',
  name: 'Existing',
  description: 'Desc',
  super_category_id: 'S',
  category_id: 'C',
  sub_category_id: 'SUB',
  participant_mode: 'TEAM',
  tool_instances: [
    {
      __typename: 'ChallengeToolInstance',
      instance_id: 'inst-1',
      tool_id: 'tool-1',
      tool_type: 'SCORE_COUNTER',
      tool_version: 1,
      preset_id: 'preset-1',
      label: 'Rounds',
      config_json: JSON.stringify({ max_score: 25 }),
    },
  ],
  winner_rules: {
    __typename: 'ChallengeWinnerRules',
    rank_by: 'inst-1',
    direction: 'ASC',
    tie_breakers: [{ __typename: 'ChallengeRankKey', rank_by: 'TOTAL', direction: 'DESC' }],
    podium_size: 5,
  },
});

describe('ChallengeFormDialog', () => {
  beforeEach(() => {
    createFn.mockReset().mockResolvedValue({});
    updateFn.mockReset().mockResolvedValue({});
    createState = { loading: false, error: undefined };
    updateState = { loading: false, error: undefined };
    submitted.values = null;
    wireMutations();
  });

  it('shows a progress bar until the tools arrive, then the form with them', async () => {
    renderWithProviders(<ChallengeFormDialog open editing={null} onClose={vi.fn()} />, {
      mocks: engineMocks(40),
    });
    expect(screen.getByRole('progressbar', { name: 'Loading tools…' })).toBeInTheDocument();
    expect(screen.queryByTestId('form-values')).not.toBeInTheDocument();

    expect(await screen.findByTestId('form-tools')).toHaveTextContent('tool-1');
    await waitFor(() => expect(screen.getByTestId('form-presets')).toHaveTextContent('preset-1'));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('starts a new template blank: individuals, ranked by the total, three podium places', async () => {
    renderWithProviders(<ChallengeFormDialog open editing={null} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(screen.getByText('New challenge')).toBeInTheDocument();
    expect(await formValues()).toEqual({
      name: '',
      description: '',
      super_id: '',
      category_id: '',
      sub_id: '',
      participant_mode: 'INDIVIDUAL',
      tool_instances: [],
      winner_rules: { rank_by: 'TOTAL', direction: 'DESC', tie_breakers: [], podium_size: 3 },
    });
  });

  it('creates from the submitted values — trimmed, empty scope and preset as null — then saves and closes', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    submitted.values = {
      name: '  Run 5k  ',
      description: 'do it',
      super_id: 'sp',
      category_id: '',
      sub_id: '',
      participant_mode: 'TEAM',
      tool_instances: [
        {
          instance_id: 'a1',
          tool_id: 'tool-1',
          tool_type: 'SCORE_COUNTER',
          preset_id: '',
          label: '  Laps  ',
          config: { max_score: 12, allow_negative: true },
        },
      ],
      winner_rules: { rank_by: 'a1', direction: 'DESC', tie_breakers: [], podium_size: 3 },
    } satisfies TemplateFormValues;
    renderWithProviders(
      <ChallengeFormDialog open editing={null} onClose={onClose} onSaved={onSaved} />,
      { mocks: engineMocks() },
    );

    fireEvent.click(await screen.findByText('form-submit'));

    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1));
    expect(createFn).toHaveBeenCalledWith({
      variables: {
        input: {
          name: 'Run 5k',
          description: 'do it',
          super_category_id: 'sp',
          category_id: null,
          sub_category_id: null,
          participant_mode: 'TEAM',
          tool_instances: [
            {
              instance_id: 'a1',
              tool_id: 'tool-1',
              preset_id: null,
              label: 'Laps',
              config_json: '{"max_score":12,"allow_negative":true}',
            },
          ],
          winner_rules: { rank_by: 'a1', direction: 'DESC', tie_breakers: [], podium_size: 3 },
        },
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('prefills an existing template: scope, teams, its tools with settings completed from the tool defaults, and its winner rules', async () => {
    renderWithProviders(<ChallengeFormDialog open editing={scoped} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(screen.getByText('Edit challenge')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await formValues()).toEqual({
        name: 'Existing',
        description: 'Desc',
        super_id: 'S',
        category_id: 'C',
        sub_id: 'SUB',
        participant_mode: 'TEAM',
        tool_instances: [
          {
            instance_id: 'inst-1',
            tool_id: 'tool-1',
            tool_type: 'SCORE_COUNTER',
            preset_id: 'preset-1',
            label: 'Rounds',
            // max_score was stored; allow_negative was not, so the tool's default fills it.
            config: { max_score: 25, allow_negative: false },
          },
        ],
        winner_rules: {
          rank_by: 'inst-1',
          direction: 'ASC',
          tie_breakers: [{ rank_by: 'TOTAL', direction: 'DESC' }],
          podium_size: 5,
        },
      }),
    );
  });

  it('updates the template being edited by id, and never creates', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <ChallengeFormDialog open editing={scoped} onClose={onClose} onSaved={onSaved} />,
      { mocks: engineMocks() },
    );
    // Wait for the tools, so the submitted values carry the completed settings.
    await waitFor(async () =>
      expect((await formValues()).tool_instances[0].config).toEqual({ max_score: 25, allow_negative: false }),
    );
    fireEvent.click(screen.getByText('form-submit'));

    await waitFor(() => expect(updateFn).toHaveBeenCalledTimes(1));
    const { variables } = updateFn.mock.calls[0][0] as {
      variables: { id: string; input: Record<string, unknown> };
    };
    expect(variables.id).toBe('ch1');
    expect(variables.input).toMatchObject({
      name: 'Existing',
      super_category_id: 'S',
      category_id: 'C',
      sub_category_id: 'SUB',
      participant_mode: 'TEAM',
      tool_instances: [
        {
          instance_id: 'inst-1',
          tool_id: 'tool-1',
          preset_id: 'preset-1',
          label: 'Rounds',
          config_json: '{"max_score":25,"allow_negative":false}',
        },
      ],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(createFn).not.toHaveBeenCalled();
  });

  it('reads an unknown mode as individuals and an unknown order as highest-first', async () => {
    const odd = makeChallenge({
      participant_mode: 'SOLO',
      winner_rules: {
        __typename: 'ChallengeWinnerRules',
        rank_by: 'TOTAL',
        direction: 'SIDEWAYS',
        tie_breakers: [{ __typename: 'ChallengeRankKey', rank_by: 'TOTAL', direction: 'UP' }],
        podium_size: 1,
      },
    });
    renderWithProviders(<ChallengeFormDialog open editing={odd} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    const values = await formValues();
    expect(values.participant_mode).toBe('INDIVIDUAL');
    expect(values.winner_rules).toEqual({
      rank_by: 'TOTAL',
      direction: 'DESC',
      tie_breakers: [{ rank_by: 'TOTAL', direction: 'DESC' }],
      podium_size: 1,
    });
  });

  it('shows why a create failed, and tells the form a save is in flight', async () => {
    createState = { loading: true, error: { message: 'create boom' } };
    wireMutations();
    renderWithProviders(<ChallengeFormDialog open editing={null} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(screen.getByRole('alert')).toHaveTextContent('create boom');
    expect(await screen.findByTestId('form-saving')).toHaveTextContent('true');
  });

  it('shows why an update failed, and tells the form a save is in flight', async () => {
    updateState = { loading: true, error: { message: 'update boom' } };
    wireMutations();
    renderWithProviders(<ChallengeFormDialog open editing={scoped} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(screen.getByRole('alert')).toHaveTextContent('update boom');
    expect(await screen.findByTestId('form-saving')).toHaveTextContent('true');
  });

  it('is not saving and shows no error when neither mutation is running', async () => {
    renderWithProviders(<ChallengeFormDialog open editing={null} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(await screen.findByTestId('form-saving')).toHaveTextContent('false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    renderWithProviders(<ChallengeFormDialog open={false} editing={scoped} onClose={vi.fn()} />, {
      mocks: engineMocks(),
    });
    expect(screen.queryByText('Edit challenge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-values')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('Cancel closes the dialog without saving', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ChallengeFormDialog open editing={null} onClose={onClose} />, {
      mocks: engineMocks(),
    });
    fireEvent.click(await screen.findByText('form-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createFn).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });
});
