// Presentation reads the normalized result; never infer a winner or score from
// sourceScore, map scores, the current time, or a raw tournament record.
export function matchStatusLabel(match, copy) {
  return ["completed", "walkover", "bye"].includes(match.status) && !match.result.confirmed
    ? copy.resultPending
    : copy.matchStates[match.status] || copy.unknownStatus;
}
