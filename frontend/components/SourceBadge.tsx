interface SourceBadgeProps {
  source: string;
}

const SOURCE_COLORS: Record<string, string> = {
  otakudesu: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  samehadaku: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  neonime: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  animekuindo: 'bg-green-500/20 text-green-400 border-green-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null;

  const key = source.toLowerCase().replace(/[^a-z0-9]/g, '');
  const colorClass = SOURCE_COLORS[key] ?? SOURCE_COLORS.default;
  const displayName = source.charAt(0).toUpperCase() + source.slice(1);

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${colorClass}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      Sumber: {displayName}
    </span>
  );
}
