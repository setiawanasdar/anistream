import Link from 'next/link';

interface GenreTagProps {
  genre: string;
  slug?: string;
}

export default function GenreTag({ genre, slug }: GenreTagProps) {
  const finalSlug = slug || genre.toLowerCase().replace(/\s+/g, '-');
  return (
    <Link href={`/genre/${finalSlug}`}>
      <span className="inline-block text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary-light bg-primary/10 hover:bg-primary/20 hover:border-primary/60 transition-colors cursor-pointer">
        {genre}
      </span>
    </Link>
  );
}
