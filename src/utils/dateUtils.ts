export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export interface DateGroupInfo {
  key: string; // 'YYYY-MM-DD' for reliable sorting
  label: string; // '22 Aug' or '22 Aug 2025'
  relativeLabel?: string; // 'Today', 'Yesterday'
  day: number;
  month: string;
  year: number;
}

export function getDateGroupInfo(timestamp: number): DateGroupInfo {
  const d = new Date(timestamp);
  const now = new Date();

  const year = d.getFullYear();
  const month = MONTHS_SHORT[d.getMonth()] || 'Jan';
  const day = d.getDate();

  const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isCurrentYear = year === now.getFullYear();
  const label = isCurrentYear ? `${day} ${month}` : `${day} ${month} ${year}`;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const itemMidnight = new Date(year, d.getMonth(), day).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((todayMidnight - itemMidnight) / oneDayMs);

  let relativeLabel: string | undefined;
  if (diffDays === 0) {
    relativeLabel = 'Today';
  } else if (diffDays === 1) {
    relativeLabel = 'Yesterday';
  }

  return {
    key,
    label,
    relativeLabel,
    day,
    month,
    year,
  };
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
