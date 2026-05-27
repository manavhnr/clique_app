import mongoose, { Document, Schema } from 'mongoose';

export interface IEventMember {
  userId: mongoose.Types.ObjectId;
  username: string;
  addedAt: Date;
}

export interface IEvent extends Document {
  hostId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  category: 'house_party' | 'club' | 'college' | 'private' | 'concert' | 'other';
  vibeTags: string[];
  musicTags: string[];
  rules?: string;
  date: Date;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  location: { type: 'Point'; coordinates: [number, number] };
  exactAddressHiddenBeforeBooking: boolean;
  price: number;
  platformFee: number;
  capacity: number;
  bookedCount: number;
  checkedInCount: number;
  privacy: 'public' | 'private';
  approvalRequired: boolean;
  ageLimit?: number;
  refundPolicy?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'blocked';
  requiresSocials: boolean;
  requiredSocials: string[];
  isFeatured: boolean;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  viewCount: number;
  coHosts: IEventMember[];
  scanners: IEventMember[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    category: {
      type: String,
      enum: ['house_party', 'club', 'college', 'private', 'concert', 'other'],
      required: true,
    },
    vibeTags: { type: [String], default: [] },
    musicTags: { type: [String], default: [] },
    rules: { type: String },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    locationName: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    exactAddressHiddenBeforeBooking: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, default: 0 },
    capacity: { type: Number, required: true, min: 1 },
    bookedCount: { type: Number, default: 0 },
    checkedInCount: { type: Number, default: 0 },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    approvalRequired: { type: Boolean, default: false },
    ageLimit: { type: Number },
    refundPolicy: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed', 'blocked'],
      default: 'draft',
    },
    requiresSocials: { type: Boolean, default: false },
    requiredSocials: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    coHosts: {
      type: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, username: String, addedAt: { type: Date, default: Date.now } }],
      default: [],
    },
    scanners: {
      type: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, username: String, addedAt: { type: Date, default: Date.now } }],
      default: [],
    },
  },
  { timestamps: true }
);

eventSchema.index({ location: '2dsphere' });
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ hostId: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
