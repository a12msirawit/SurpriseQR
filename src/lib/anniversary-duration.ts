export function getAnniversaryDuration(dateValue?: string) {
  if (!dateValue) return "100 วัน";

  const start = new Date(dateValue).getTime();
  if (!Number.isFinite(start)) return "100 วัน";

  const elapsed = Math.max(Date.now() - start, 0);
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
  return `${days} วัน ${hours} ชั่วโมง`;
}
