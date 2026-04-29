import { updateUserCliquescore } from '../utils/updateCliquescore';

export async function incrementEventAttendance(userId: string): Promise<void> {
  await updateUserCliquescore(userId, 50);
}

export async function incrementPostEngagement(
  userId: string,
  likes: number,
  comments: number,
  shares: number
): Promise<void> {
  const delta = likes * 2 + comments * 5 + shares * 8;
  await updateUserCliquescore(userId, delta);
}

export async function applyHostInteractionBoost(userId: string): Promise<void> {
  await updateUserCliquescore(userId, 100);
}

export async function applyEventVerificationBoost(userId: string): Promise<void> {
  await updateUserCliquescore(userId, 150);
}

export async function updatePeerRatingScore(userId: string, rating: number): Promise<void> {
  await updateUserCliquescore(userId, rating * 20);
}

export async function incrementConsistency(userId: string): Promise<void> {
  await updateUserCliquescore(userId, 10);
}

export async function incrementEventCreationScore(userId: string): Promise<void> {
  await updateUserCliquescore(userId, 100);
}

export async function applyNoShowPenalty(userId: string): Promise<void> {
  await updateUserCliquescore(userId, -80);
}

export async function applyReportPenalty(userId: string): Promise<void> {
  await updateUserCliquescore(userId, -50);
}
