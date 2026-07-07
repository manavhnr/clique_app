import { User } from '../models/User';

export async function updateUserCliquescore(userId: string, delta: number): Promise<void> {
  if (delta === 0) return;

  if (delta > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { cliquescore: delta } });
    return;
  }

  // Penalty: apply the decrement if there's enough score, otherwise floor to 0.
  const magnitude = Math.abs(delta);
  const decremented = await User.findOneAndUpdate(
    { _id: userId, cliquescore: { $gte: magnitude } },
    { $inc: { cliquescore: delta } }
  );
  if (!decremented) {
    // Score was below the penalty magnitude — clamp to 0 rather than skipping.
    await User.findByIdAndUpdate(userId, { $set: { cliquescore: 0 } });
  }
}
