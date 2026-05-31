export function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2);
}

export function numberWithCommas(n: number): string {
  return n.toLocaleString('ja-JP');
}

export function formatYen(n: number): string {
  return '¥' + numberWithCommas(Math.abs(n));
}
