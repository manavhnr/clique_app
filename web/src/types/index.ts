export interface ConnectedSocials {
  instagram?: string;
  twitter?: string;
  snapchat?: string;
  facebook?: string;
  linkedin?: string;
}

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
  connectedSocials?: ConnectedSocials;
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
  isPrivate?: boolean;
  pushNotificationsEnabled?: boolean;
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
  requiresSocials?: boolean;
  requiredSocials?: string[];
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
  userRequest?: JoinRequest | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  userId: string | User;
  eventId: string | Event;
  hostId: string;
  status: 'pending' | 'payment_pending' | 'confirmed' | 'checked_in' | 'cancelled' | 'refunded' | 'rejected';
  amount: number;
  passId?: string;
  createdAt: string;
}

export interface JoinRequest {
  _id: string;
  userId: string | User;
  eventId: string;
  hostId: string;
  status: 'requested' | 'approved' | 'rejected' | 'expired';
  message?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface Pass {
  _id: string;
  bookingId: string;
  userId: string | User;
  eventId: string | Event;
  passType?: 'individual' | 'group';
  groupId?: string;
  memberIds?: string[];
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

export interface SquadMember {
  userId: string;
  name: string;
  username: string;
  profileImage?: string;
  gender?: string;
  phone?: string;
  connectedSocials?: { instagram?: string };
  city?: string;
  cliquescore?: number;
  requestStatus?: 'requested' | 'approved' | 'rejected' | 'expired' | null;
  joinedAt: string;
}

export interface SquadInvite {
  userId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
}

export interface Squad {
  _id: string;
  eventId: string;
  name: string;
  creatorId: string;
  members: SquadMember[];
  invites: SquadInvite[];
  groupStatus?: 'pending' | 'approved' | 'mixed';
  groupPass?: { _id: string; status: string } | null;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}
