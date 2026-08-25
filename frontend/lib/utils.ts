export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatRating(rating: string | number): string {
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(num)) return 'N/A';
  return num.toFixed(1);
}

export function truncate(text: string, length: number): string {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function formatEpisodeNumber(n: string | number): string {
  return `Episode ${n}`;
}

export function getDayName(dayIndex: number): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[dayIndex] ?? 'Tidak Diketahui';
}

export function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} hari lalu`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} bulan lalu`;
  return `${Math.floor(diff / 31536000)} tahun lalu`;
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'ongoing':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'complete':
    case 'completed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function getTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'tv':
      return 'bg-primary/20 text-primary-light border-primary/30';
    case 'movie':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'ova':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'ona':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function normalizeStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'ongoing': return 'Sedang Tayang';
    case 'complete':
    case 'completed': return 'Selesai';
    default: return status || 'Tidak Diketahui';
  }
}
