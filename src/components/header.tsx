import Link from "next/link";
import { MoonLogo } from "./moon-logo";

export function Header() {
  return (
    <header className="w-full border-b border-border">
      <div className="max-w-[1180px] mx-auto px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <MoonLogo className="w-8 h-8" />
          <span className="font-[family-name:var(--font-display)] text-xl text-ink">
            DayDreamers
          </span>
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-medium text-dust hover:text-ink transition-colors duration-150"
          >
            Workshops
          </Link>
          <Link
            href="https://www.daydreamers-academy.com"
            target="_blank"
            className="text-sm font-medium text-dust hover:text-ink transition-colors duration-150"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
