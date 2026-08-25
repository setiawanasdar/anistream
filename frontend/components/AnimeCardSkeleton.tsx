export default function AnimeCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[155px] sm:w-[165px]">
      {/* Poster skeleton */}
      <div className="w-full aspect-[2/3] rounded-lg skeleton" />
      {/* Title skeleton */}
      <div className="mt-1.5 space-y-1">
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-3/4" />
      </div>
    </div>
  );
}
