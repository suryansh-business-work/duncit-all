import { Schema, model, InferSchemaType } from 'mongoose';
import { STATUSES } from './user.constants';

const petProfileSchema = new Schema(
  {
    name: { type: String, trim: true },
    species: { type: String, trim: true },
    breed: { type: String, trim: true },
    age: { type: Number, min: 0 },
    photo_url: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },

    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    is_email_verified: { type: Boolean, default: false },

    phone_number: { type: String, required: true, trim: true },
    phone_extension: { type: String, required: true, trim: true },
    is_phone_verified: { type: Boolean, default: false },

    password: { type: String, select: false },

    google_id: { type: String, unique: true, sparse: true, index: true },

    dob: { type: Date, required: true },

    country: { type: String, default: 'India' },
    city: String,
    zone: String,

    roles: {
      type: [String],
      required: true,
      default: ['USER'],
    },

    assigned_city: String,
    assigned_zones: { type: [String], default: [] },

    profile_photo: String,
    bio: String,

    pet_profile: { type: petProfileSchema, default: null },

    is_first_time_user: { type: Boolean, default: true },

    status: {
      type: String,
      enum: STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.index({ phone_number: 1, phone_extension: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: any };
export const UserModel = model('User', userSchema);
