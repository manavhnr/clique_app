import mongoose, { Document, Schema } from 'mongoose';

export interface IRelationship extends Document {
  requesterId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  type: 'follow' | 'friend' | 'block';
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const relationshipSchema = new Schema<IRelationship>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['follow', 'friend', 'block'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], required: true },
  },
  { timestamps: true }
);

relationshipSchema.index({ requesterId: 1, receiverId: 1, type: 1 }, { unique: true });
relationshipSchema.index({ receiverId: 1, type: 1 });

export const Relationship = mongoose.model<IRelationship>('Relationship', relationshipSchema);
