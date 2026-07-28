export function computeWorkoutDayFlags(weeklyDays: number, totalDays = 7): boolean[] {
  const flags = new Array(totalDays).fill(false)
  const n = Math.max(0, Math.min(weeklyDays, totalDays))
  if (n === 0) return flags

  if (n === 1) {
    flags[Math.round((totalDays - 1) / 2)] = true
    return flags
  }

  for (let i = 0; i < n; i++) {
    const pos = Math.round((i * (totalDays - 1)) / (n - 1))
    flags[pos] = true
  }
  return flags
}
