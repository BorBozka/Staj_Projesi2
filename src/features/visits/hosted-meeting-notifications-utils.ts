export function getNextExpandedMeetingId(currentMeetingId: string | null, selectedMeetingId: string) {
  return currentMeetingId === selectedMeetingId ? null : selectedMeetingId
}
