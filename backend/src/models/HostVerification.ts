import mongoose, { Document, Schema } from 'mongoose';

export interface IHostVerification extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: string;
  documentUrl: string;
  selfieUrl?: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hostVerificationSchema = new Schema<IHostVerification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    documentType: { type: String, required: true },
    documentUrl: { type: String, required: true },
    selfieUrl: { type: String },
    address: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hostVerificationSchema.index({ status: 1 });

export const HostVerification = mongoose.model<IHostVerification>('HostVerification', hostVerificationSchema);
