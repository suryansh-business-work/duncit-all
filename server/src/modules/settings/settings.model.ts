import { Schema, model, type Document } from 'mongoose';

export interface IAppSettings extends Document {
  singleton_key: string;
  jwt_expires_in: string | null;
  jwt_no_expiry: boolean;
  date_format: string;
  time_format: string;
  created_at: Date;
  updated_at: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'app' },
    jwt_expires_in: { type: String, default: '7d' },
    jwt_no_expiry: { type: Boolean, default: false },
    date_format: { type: String, default: 'dd MMM yyyy' },
    time_format: { type: String, default: 'hh:mm a' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AppSettingsModel = model<IAppSettings>('AppSettings', appSettingsSchema);

export interface IFeatureFlag extends Document {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const FeatureFlagModel = model<IFeatureFlag>('FeatureFlag', featureFlagSchema);

export interface IBranding extends Document {
  singleton_key: string;
  app_name: string;
  logo_url: string;
  primary_color: string;
  support_email: string;
  created_at: Date;
  updated_at: Date;
}

const brandingSchema = new Schema<IBranding>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'branding' },
    app_name: { type: String, default: 'Duncit' },
    logo_url: { type: String, default: '' },
    primary_color: { type: String, default: '#1976d2' },
    support_email: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BrandingModel = model<IBranding>('Branding', brandingSchema);
