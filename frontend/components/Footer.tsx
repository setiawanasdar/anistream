import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-[#1a1a1a] mt-12">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Logo + Description */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm">
                A
              </div>
              <span className="text-white font-bold text-lg tracking-tight">AniStream</span>
            </Link>
            <p className="text-gray-500 text-xs leading-relaxed">
              Nonton anime sub Indonesia secara gratis. Nikmati koleksi anime terlengkap dengan kualitas terbaik.
            </p>
            <p className="text-gray-600 text-xs bg-[#111] border border-[#222] rounded px-3 py-2">
              ⚠️ Untuk penggunaan pribadi. Kami tidak menyimpan video apapun.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Navigasi</h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Beranda' },
                { href: '/schedule', label: 'Jadwal Tayang' },
                { href: '/search', label: 'Cari Anime' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Informasi</h3>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li>Subtitle: Bahasa Indonesia</li>
              <li>Kualitas: SD / HD / FHD</li>
              <li>Platform: Web Browser</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © 2024 AniStream. Semua hak cipta milik pemilik masing-masing.
          </p>
          <p className="text-gray-700 text-xs">
            Dibuat dengan ❤️ untuk pecinta anime Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
