import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  parentCommentId?: mongoose.Types.ObjectId;
  likeCount: number;
  status: 'active' | 'hidden' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    likeCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden', 'removed'], default: 'active' },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
