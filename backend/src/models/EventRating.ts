import mongoose, { Document, Schema } from 'mongoose';

export interface IEventRating extends Document {
  raterId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  rating: number;
  createdAt: Date;
}

const eventRatingSchema = new Schema<IEventRating>(
  {
    raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

eventRatingSchema.index({ raterId: 1, targetUserId: 1, eventId: 1 }, { unique: true });

export const EventRating = mongoose.model<IEventRating>('EventRating', eventRatingSchema);
