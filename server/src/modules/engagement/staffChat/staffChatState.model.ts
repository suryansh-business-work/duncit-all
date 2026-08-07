import mongoose, { Schema, type Document } from 'mongoose';

/**
 * How one person has staff chat set up, kept across sessions and machines.
 *
 * localStorage was doing this, which meant the panel forgot everything on a
 * refresh in a different portal and remembered nothing at all on a second
 * machine — and staff chat is deliberately the same panel in all seventeen
 * consoles, so "per browser" was the wrong unit from the start.
 *
 * One document per user, upserted. It holds the two kinds of state worth
 * keeping: what was open, and how it should look.
 */

export const CHAT_DENSITIES = ['COMPACT', 'COMFORTABLE'] as const;
export const BUBBLE_COLORS = ['primary', 'secondary', 'success', 'info'] as const;

export interface IStaffChatState extends Document {
  user_id: string;
  /** Whether the sidebar was showing when they last left. */
  panel_open: boolean;
  /** The team filter, or '' for everyone. */
  role_filter: string;
  /** The conversation that was open, so a refresh returns to it. */
  open_peer_id: string | null;
  density: (typeof CHAT_DENSITIES)[number];
  bubble_color: (typeof BUBBLE_COLORS)[number];
  font_size: number;
  /** IANA zone for every timestamp, or '' to follow the machine. */
  time_zone: string;
  /** False puts Enter on a new line and Ctrl/Cmd+Enter on send. */
  enter_to_send: boolean;
  created_at: Date;
  updated_at: Date;
}

const staffChatStateSchema = new Schema<IStaffChatState>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    panel_open: { type: Boolean, default: false },
    role_filter: { type: String, default: '' },
    open_peer_id: { type: String, default: null },
    density: { type: String, enum: CHAT_DENSITIES, default: 'COMFORTABLE' },
    bubble_color: { type: String, enum: BUBBLE_COLORS, default: 'primary' },
    // Bounded here as well as in the UI: this is written straight from a
    // mutation, and a font size of 400 is a broken panel nobody can fix from
    // inside the panel.
    font_size: { type: Number, default: 14, min: 11, max: 22 },
    time_zone: { type: String, default: '' },
    enter_to_send: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StaffChatStateModel =
  (mongoose.models.StaffChatState as mongoose.Model<IStaffChatState>) ||
  mongoose.model<IStaffChatState>('StaffChatState', staffChatStateSchema);
