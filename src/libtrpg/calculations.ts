// Splitting out some small mathematical functions
// like XP rewards, to be able to easily test and experiment with them

export function xp_threshold(level: number): number {
  let total = 100;
  if (level <= 5) {
    return total;
  }
  let offset = level - 5;
  total += offset * 10;
  if (level <= 15) {
    return total;
  }
  offset = level - 15;
  total += offset * 40;
  if (level <= 20) {
    return total;
  }
  offset = level - 20;
  total += offset * 100;
  if (offset < 10) {
    return total;
  }
  const tens = Math.floor(offset / 10);
  total = Math.floor(Math.pow(2, tens) * tens * total);
  if (total <= 99_999) {
    return total;
  }
  return 99_999;
}

export function xp_reward(level: number): number {
  // Start at 100 XP, which matches what is needed per level between 1 and 10
  // Increase by 3x level
  // Add a small (0-2) pseudorandom number to not make the pattern so obvious
  // Otherwise you'd see the number increasing by 3 each level
  // Also add 1% of the total amount needed at that level (based on enemy's level)
  // to avoid later levels taking forever.
  const max_xp = xp_threshold(level);
  const random_looking_number =
    Math.floor((level + max_xp) * 1.1 + level % 9 + level % 8 + level % 7) % 3;
  const one_percent = max_xp / 100;
  return Math.floor(100 + random_looking_number + level * 3 + one_percent);
}
