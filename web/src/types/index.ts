export interface User {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  vibeTags?: string[];
  cliquescore?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  role: 'attendee' | 'host' | 'admin';
  isVerifiedHost?: boolean;
  hostVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  hasCompletedSetup?: boolean;
  averageRating?: number;
  dob?: string;
  gender?: string;
}

export interface EventMember {
  userId: string;
  username: string;
  addedAt: string;
}

export interface Event {
  _id: string;
  hostId: string | User;
  title: string;
  description: string;
  images: string[];
  category: 'house_party' | 'club' | 'college' | 'private' | 'concert' | 'other';
  vibeTags: string[];
  musicTags: string[];
  rules?: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  exactAddressHiddenBeforeBooking?: boolean;
  price: number;
  platformFee?: number;
  capacity: number;
  bookedCount: number;
  checkedInCount?: number;
  privacy: 'public' | 'private';
  approvalRequired?: boolean;
  ageLimit?: number;
  refundPolicy?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'blocked';
  isFeatured?: boolean;
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  viewCount?: number;
  coHosts?: EventMember[];
  scanners?: EventMember[];
  saved?: boolean;
  userBooking?: Booking | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  userId: string;
  eventId: string | Event;
  hostId: string;
  status: 'pending' | 'payment_pending' | 'confirmed' | 'checked_in' | 'cancelled' | 'refunded' | 'rejected';
  amount: number;
  passId?: string;
  createdAt: string;
}

export interface Pass {
  _id: string;
  bookingId: string;
  userId: string | User;
  eventId: string | Event;
  qrCodeUrl?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  checkedInAt?: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  userId: string | User;
  text?: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'mixed' | 'none';
  linkedEventId?: string | Event;
  visibility?: string;
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}
