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
  support_phone: string;
  mascot_name: string;
  mascot_description_html: string;
  mascot_lottie_url: string;
  mascot_on_chair_lottie_url: string;
  mascot_winner_lottie_url: string;
  welcome_lottie_url: string;
  app_loader_lottie_url: string;
  confetti_lottie_url: string;
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
    support_phone: { type: String, default: '' },
    mascot_name: { type: String, default: 'Dunko' },
    mascot_description_html: {
      type: String,
      default:
        '<p><strong>Dunko</strong> is the soul of Duncit \u2014 a playful guide who helps you find your tribe, join pods, and celebrate every win together.</p>',
    },
    mascot_lottie_url: { type: String, default: '' },
    mascot_on_chair_lottie_url: { type: String, default: '' },
    mascot_winner_lottie_url: { type: String, default: '' },
    welcome_lottie_url: { type: String, default: '' },
    app_loader_lottie_url: { type: String, default: '' },
    confetti_lottie_url: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const BrandingModel = model<IBranding>('Branding', brandingSchema);

export interface IEnvironmentVariable extends Document {
  key: string;
  value: string;
  updated_by?: Schema.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const environmentVariableSchema = new Schema<IEnvironmentVariable>(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    value: { type: String, default: '' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const EnvironmentVariableModel = model<IEnvironmentVariable>(
  'EnvironmentVariable',
  environmentVariableSchema
);
