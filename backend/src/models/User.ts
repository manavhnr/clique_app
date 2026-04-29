import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  phone: string;
  email?: string;
  dob?: Date;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profileImage?: string;
  bio?: string;
  city?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  interests: string[];
  vibeTags: string[];
  cliquescore: number;
  role: 'attendee' | 'host' | 'admin';
  isVerifiedHost: boolean;
  hostVerificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  followerCount: number;
  followingCount: number;
  postCount: number;
  averageRating: number;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    dob: { type: Date },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    profileImage: { type: String },
    bio: { type: String, maxlength: 300 },
    city: { type: String },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    interests: { type: [String], default: [] },
    vibeTags: { type: [String], default: [] },
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
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ cliquescore: -1 });
userSchema.index({ location: '2dsphere' });

export const User = mongoose.model<IUser>('User', userSchema);
