import { Schema, model, type Types } from 'mongoose';

/**
 * What a person asked Ask Duncit to remember about them across conversations
 * ("I prefer Hinglish", "I live in Indiranagar"). Theirs alone: shown and
 * cleared from the app, never read for anyone else.
 */
export interface MemoryFact {
  id: string;
  text: string;
  conversation_id: string | null;
  created_at: Date;
}

export interface IAskDuncitMemory {
  _id: Types.ObjectId;
  user_id: string;
  facts: MemoryFact[];
  updated_at: Date;
}

const memorySchema = new Schema<IAskDuncitMemory>(
  {
    user_id: { type: String, required: true, unique: true },
    facts: {
      type: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          conversation_id: { type: String, default: null },
          created_at: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

export const AskDuncitMemoryModel = model<IAskDuncitMemory>('AskDuncitMemory', memorySchema);
