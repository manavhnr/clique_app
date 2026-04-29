import { User } from '../models/User';

export async function updateUserCliquescore(userId: string, delta: number): Promise<void> {
  if (delta === 0) return;

  if (delta > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { cliquescore: delta } });
  } else {
    // Prevent cliquescore going below 0
    await User.findOneAndUpdate(
      { _id: userId, cliquescore: { $gte: Math.abs(delta) } },
      { $inc: { cliquescore: delta } }
    );
  }
}
