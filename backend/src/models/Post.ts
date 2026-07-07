import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  text?: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'mixed' | 'none';
  linkedEventId?: mongoose.Types.ObjectId;
  location?: string;
  visibility: 'public' | 'followers' | 'private';
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reportCount: number;
  status: 'active' | 'hidden' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxlength: 2000 },
    mediaUrls: { type: [String], default: [] },
    mediaType: { type: String, enum: ['image', 'video', 'mixed', 'none'], default: 'none' },
    linkedEventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    location: { type: String },
    visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden', 'removed'], default: 'active' },
  },
  { timestamps: true }
);

postSchema.index({ userId: 1, status: 1, createdAt: -1 });     // followed-users feed
postSchema.index({ status: 1, visibility: 1, createdAt: -1 }); // trending / public discovery
postSchema.index({ linkedEventId: 1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
