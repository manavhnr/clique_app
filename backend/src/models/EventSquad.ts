import mongoose, { Document, Schema } from 'mongoose';

export interface ISquadMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  username: string;
  joinedAt: Date;
}

export interface ISquadInvite {
  userId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: Date;
}

export interface IEventSquad extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  creatorId: mongoose.Types.ObjectId;
  members: ISquadMember[];
  invites: ISquadInvite[];
  createdAt: Date;
  updatedAt: Date;
}

const squadMemberSchema = new Schema<ISquadMember>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:     { type: String, required: true },
    username: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const squadInviteSchema = new Schema<ISquadInvite>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    invitedAt:   { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventSquadSchema = new Schema<IEventSquad>(
  {
    eventId:   { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name:      { type: String, trim: true, maxlength: 50 },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members:   { type: [squadMemberSchema], default: [] },
    invites:   { type: [squadInviteSchema], default: [] },
  },
  { timestamps: true }
);

// Fast look-up: who is in what squad for an event
eventSquadSchema.index({ eventId: 1 });
eventSquadSchema.index({ 'members.userId': 1, eventId: 1 });

export const EventSquad = mongoose.model<IEventSquad>('EventSquad', eventSquadSchema);
