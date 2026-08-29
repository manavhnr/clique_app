import mongoose, { Document, Schema } from 'mongoose';

export interface IConnectedSocials {
  instagram?: string;
  twitter?: string;
  snapchat?: string;
  facebook?: string;
  linkedin?: string;
}

export interface IUser extends Document {
  unlockedSecretEvents: mongoose.Types.ObjectId[];
  name: string;        // set during profile setup, empty string at signup
  username: string;
  password?: string;   // bcrypt hash, select:false — set during profile setup
  phone: string;
  email?: string;
  dob?: Date;
  age?: number;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  profileImage?: string;
  bio?: string;
  city?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  interests: string[];
  vibeTags: string[];
  connectedSocials: IConnectedSocials;
  cliquescore: number;
  role: 'attendee' | 'host' | 'admin';
  isVerifiedHost: boolean;
  hostVerificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  followerCount: number;
  followingCount: number;
  postCount: number;
  averageRating: number;
  isPrivate: boolean;
  pushNotificationsEnabled: boolean;
  hasCompletedSetup: boolean;
  upiId?: string;
  payoutStatus: 'not_started' | 'active';
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, default: '', trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, select: false },
    phone: { type: String, required: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    dob: { type: Date },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'prefer_not_to_say'] },
    profileImage: { type: String },
    bio: { type: String, maxlength: 300 },
    city: { type: String },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    interests: { type: [String], default: [] },
    vibeTags: { type: [String], default: [] },
    connectedSocials: {
      type: {
        instagram: { type: String, trim: true },
        twitter: { type: String, trim: true },
        snapchat: { type: String, trim: true },
        facebook: { type: String, trim: true },
        linkedin: { type: String, trim: true },
      },
      default: {},
      _id: false,
    },
    cliquescore: { type: Number, default: 0, min: 0 },
    role: { type: String, enum: ['attendee', 'host', 'admin'], default: 'attendee' },
    isVerifiedHost: { type: Boolean, default: false },
    hostVerificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    isPrivate: { type: Boolean, default: false },
    pushNotificationsEnabled: { type: Boolean, default: true },
    hasCompletedSetup: { type: Boolean, default: false },
    upiId: { type: String },
    payoutStatus: {
      type: String,
      enum: ['not_started', 'active'],
      default: 'not_started',
    },
    isBanned: { type: Boolean, default: false },
    unlockedSecretEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: [] }],
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ cliquescore: -1 });
userSchema.index({ location: '2dsphere' });

export const User = mongoose.model<IUser>('User', userSchema);
