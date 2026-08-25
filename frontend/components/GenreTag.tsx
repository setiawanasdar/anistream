import Link from 'next/link';

interface GenreTagProps {
  genre: string;
  slug?: string;
}

export default function GenreTag({ genre, slug }: GenreTagProps) {
  const content = (
    <span className="inline-block text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary-light bg-primary/10 hover:bg-primary/20 hover:border-primary/60 transition-colors cursor-pointer">
      {genre}
    </span>
  );

  if (slug) {
    return <Link href={`/genre/${slug}`}>{content}</Link>;
  }
  return content;
}
