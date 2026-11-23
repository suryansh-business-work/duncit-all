import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { socketOrigin } from '@duncit/shell';
import { graphqlUrl } from '../runtime';
import { authToken } from './rest';

/**
 * Live answer frames for the signed-in person (the server emits to their own
 * room). One socket per mounted listener; frames only make it feel instant —
 * the stored message is re-read when a turn finishes.
 */

export interface DeltaFrame {
  message_id: string;
  text: string;
}
export interface ToolFrame {
  message_id: string;
  name: string;
  title?: string;
  status: string;
  approval_id?: string | null;
}
export interface DoneFrame {
  message_id: string;
  conversation_id: string;
}
export interface TitleFrame {
  conversation_id: string;
  title: string;
}
export interface ApprovalFrame {
  approval_id: string;
  status: string;
}

export interface IntelEventHandlers {
  onDelta?: (f: DeltaFrame) => void;
  onTool?: (f: ToolFrame) => void;
  onDone?: (f: DoneFrame) => void;
  onTitle?: (f: TitleFrame) => void;
  onApproval?: (f: ApprovalFrame) => void;
}

export function useIntelEvents(handlers: IntelEventHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const token = authToken();
    const origin = socketOrigin(graphqlUrl);
    if (!token || !origin) return undefined;
    const socket: Socket = io(origin, { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('intel:delta', (f: DeltaFrame) => ref.current.onDelta?.(f));
    socket.on('intel:tool', (f: ToolFrame) => ref.current.onTool?.(f));
    socket.on('intel:done', (f: DoneFrame) => ref.current.onDone?.(f));
    socket.on('intel:title', (f: TitleFrame) => ref.current.onTitle?.(f));
    socket.on('intel:approval', (f: ApprovalFrame) => ref.current.onApproval?.(f));
    return () => {
      socket.disconnect();
    };
  }, []);
}
