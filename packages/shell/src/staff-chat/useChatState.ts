import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { formatInTimeZone } from 'date-fns-tz';
import { SAVE_STAFF_CHAT_STATE, STAFF_CHAT_STATE, type StaffChatState } from './queries';
import { DEFAULT_CHAT_SETTINGS, type ChatSettings } from './useChatSettings';

/** What the panel remembers besides how it looks. */
export interface PanelState {
  panelOpen: boolean;
  role: string;
  openPeerId: string | null;
  /** The microphone and camera picked in Audio & video settings. */
  micId: string;
  camId: string;
  /** What those devices were CALLED — the half of the choice that travels. */
  micLabel: string;
  camLabel: string;
}

const DEFAULT_PANEL: PanelState = {
  panelOpen: false,
  role: '',
  openPeerId: null,
  micId: '',
  camId: '',
  micLabel: '',
  camLabel: '',
};

const toSettings = (state?: StaffChatState | null): ChatSettings =>
  state
    ? {
        density: state.density as ChatSettings['density'],
        bubbleColor: state.bubble_color as ChatSettings['bubbleColor'],
        fontSize: state.font_size,
        timeZone: state.time_zone,
        enterToSend: state.enter_to_send,
      }
    : DEFAULT_CHAT_SETTINGS;

const toPanel = (state?: StaffChatState | null): PanelState =>
  state
    ? {
        panelOpen: state.panel_open,
        role: state.role_filter,
        openPeerId: state.open_peer_id,
        micId: state.mic_id,
        camId: state.cam_id,
        micLabel: state.mic_label,
        camLabel: state.cam_label,
      }
    : DEFAULT_PANEL;

/** Client key to the server's field name — one place, so they cannot drift. */
const SETTING_FIELD: Record<keyof ChatSettings, string> = {
  density: 'density',
  bubbleColor: 'bubble_color',
  fontSize: 'font_size',
  timeZone: 'time_zone',
  enterToSend: 'enter_to_send',
};

/**
 * How staff chat is set up, kept on the server.
 *
 * It used to be localStorage, on the reasoning that these are per-device
 * preferences. That was wrong for this feature: the same panel renders inside
 * all seventeen consoles, so "per device" actually meant "per portal you happen
 * to have open", and moving from admin to finance forgot the conversation you
 * were in and the team you had filtered to.
 *
 * Writes are fire-and-forget and applied locally first — nobody should watch a
 * round trip to change a font size — and each write sends only the field that
 * changed, so two tabs cannot overwrite each other's unrelated settings.
 */
export function useChatState() {
  const { data } = useQuery<{ staffChatState: StaffChatState }>(STAFF_CHAT_STATE, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(SAVE_STAFF_CHAT_STATE);

  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [panel, setPanel] = useState<PanelState>(DEFAULT_PANEL);
  /**
   * Whether the server's answer has been applied.
   *
   * Applied ONCE. Re-applying on every refetch would drag the panel back to
   * whatever was saved while somebody was using it.
   */
  const [loaded, setLoaded] = useState(false);

  const state = data?.staffChatState;
  useEffect(() => {
    if (!state || loaded) return;
    setSettings(toSettings(state));
    setPanel(toPanel(state));
    setLoaded(true);
  }, [state, loaded]);

  const push = useCallback(
    (input: Record<string, unknown>) => {
      save({ variables: { input } }).catch(() => undefined);
    },
    [save]
  );

  const update = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      push({ [SETTING_FIELD[key]]: value });
    },
    [push]
  );

  const setPanelOpen = useCallback(
    (open: boolean) => {
      setPanel((current) => ({ ...current, panelOpen: open }));
      push({ panel_open: open });
    },
    [push]
  );

  const setRole = useCallback(
    (role: string) => {
      setPanel((current) => ({ ...current, role }));
      push({ role_filter: role });
    },
    [push]
  );

  /**
   * The chosen microphone and camera.
   *
   * These were only ever in useCall state, so the dialog appeared to save and
   * forgot on the next refresh — the one setting somebody changes precisely
   * because the default was wrong for them.
   *
   * The NAME is saved with the id. A deviceId is salted per origin, so the id
   * chosen in admin matches nothing in finance and this same state is read by
   * all seventeen consoles — which is how a saved microphone came to be
   * ignored everywhere except the console it was picked in. The label is what
   * survives that, and useCall matches on it when the id draws a blank.
   */
  const setDevice = useCallback(
    (kind: 'mic' | 'cam', id: string, label: string) => {
      const mic = kind === 'mic';
      setPanel((current) => ({
        ...current,
        [mic ? 'micId' : 'camId']: id,
        [mic ? 'micLabel' : 'camLabel']: label,
      }));
      push(mic ? { mic_id: id, mic_label: label } : { cam_id: id, cam_label: label });
    },
    [push]
  );

  const setOpenPeerId = useCallback(
    (openPeerId: string | null) => {
      setPanel((current) => ({ ...current, openPeerId }));
      push({ open_peer_id: openPeerId });
    },
    [push]
  );

  /**
   * One formatter for every timestamp in the thread.
   *
   * date-fns, like the rest of this codebase — and `formatInTimeZone` for the
   * same reason `@duncit/datetime` uses it: it is the stable surface across
   * date-fns-tz majors, where `utcToZonedTime` was renamed under everybody.
   *
   * Built once per setting rather than per message: a long thread renders
   * hundreds of lines and a formatter rebuilt in that loop is visible.
   */
  const formats = useMemo(() => {
    // No choice means this machine's zone, which is what the option says.
    const zone = settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const at = (value: Date, pattern: string) => formatInTimeZone(value, zone, pattern);
    return {
      time: { format: (value: Date) => at(value, 'HH:mm') },
      full: { format: (value: Date) => at(value, 'd MMM yyyy, HH:mm') },
      day: { format: (value: Date) => at(value, 'EEEE, d MMMM') },
    };
  }, [settings.timeZone]);

  /** Spacing that both the bubble and the thread read, so they cannot disagree. */
  const spacing = settings.density === 'COMPACT' ? 0.25 : 0.9;

  return {
    settings,
    update,
    formats,
    spacing,
    panel,
    /** True once the saved state has been applied, so nothing restores twice. */
    ready: loaded,
    setPanelOpen,
    setRole,
    setOpenPeerId,
    setDevice,
  };
}
