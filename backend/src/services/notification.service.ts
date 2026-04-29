import { Notification } from '../models/Notification';
import { FCMToken } from '../models/FCMToken';

// ─── Store notification in DB ─────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: Record<string, unknown>
) {
  return Notification.create({ userId, title, body, type, data });
}

// ─── Send push via FCM ────────────────────────────────────────────────────────

async function sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return; // FCM not configured — skip silently

  const tokens = await FCMToken.find({ userId }).select('token');
  if (!tokens.length) return;

  const payload = {
    registration_ids: tokens.map((t) => t.token),
    notification: { title, body },
    data: data ?? {},
  };

  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Push failure must never crash the request
  }
}

// ─── Notification triggers ────────────────────────────────────────────────────

export async function notifyNewFollower(targetUserId: string, followerName: string) {
  const title = 'New Follower';
  const body = `${followerName} started following you`;
  await Promise.all([
    createNotification(targetUserId, title, body, 'new_follower'),
    sendPush(targetUserId, title, body),
  ]);
}

export async function notifyPostLiked(postOwnerId: string, likerName: string) {
  const title = 'Post Liked';
  const body = `${likerName} liked your post`;
  await Promise.all([
    createNotification(postOwnerId, title, body, 'post_liked'),
    sendPush(postOwnerId, title, body),
  ]);
}

export async function notifyPostCommented(postOwnerId: string, commenterName: string, postId: string) {
  const title = 'New Comment';
  const body = `${commenterName} commented on your post`;
  await Promise.all([
    createNotification(postOwnerId, title, body, 'post_commented', { postId }),
    sendPush(postOwnerId, title, body, { postId }),
  ]);
}

export async function notifyBookingConfirmed(userId: string, eventTitle: string, passId: string) {
  const title = 'Booking Confirmed!';
  const body = `Your pass for ${eventTitle} is ready`;
  await Promise.all([
    createNotification(userId, title, body, 'booking_confirmed', { passId }),
    sendPush(userId, title, body, { passId }),
  ]);
}

export async function notifyRequestApproved(userId: string, eventTitle: string) {
  const title = 'Request Approved';
  const body = `Your request to attend ${eventTitle} has been approved`;
  await Promise.all([
    createNotification(userId, title, body, 'request_approved'),
    sendPush(userId, title, body),
  ]);
}

export async function notifyRequestRejected(userId: string, eventTitle: string) {
  const title = 'Request Declined';
  const body = `Your request to attend ${eventTitle} was not approved`;
  await Promise.all([
    createNotification(userId, title, body, 'request_rejected'),
    sendPush(userId, title, body),
  ]);
}

export async function notifyEventCancelled(userId: string, eventTitle: string) {
  const title = 'Event Cancelled';
  const body = `${eventTitle} has been cancelled`;
  await Promise.all([
    createNotification(userId, title, body, 'event_cancelled'),
    sendPush(userId, title, body),
  ]);
}

export async function notifyPaymentSuccess(userId: string, eventTitle: string) {
  const title = 'Payment Successful';
  const body = `Payment confirmed for ${eventTitle}`;
  await Promise.all([
    createNotification(userId, title, body, 'payment_success'),
    sendPush(userId, title, body),
  ]);
}

// ─── Get & mark read ─────────────────────────────────────────────────────────

export async function getNotifications(userId: string, page: number, limit: number) {
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  return { notifications, unreadCount, page, limit };
}

export async function markAsRead(notificationId: string, userId: string) {
  await Notification.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true });
}

export async function markAllAsRead(userId: string) {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
}

export async function registerFCMToken(userId: string, token: string, platform?: string) {
  await FCMToken.findOneAndUpdate(
    { token },
    { userId, token, platform },
    { upsert: true, new: true }
  );
}
