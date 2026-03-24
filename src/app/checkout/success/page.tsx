import Link from "next/link";
import { MoonLogo } from "@/components/moon-logo";

export default function CheckoutSuccess() {
  return (
    <div className="max-w-lg mx-auto px-8 py-24 text-center">
      <div className="fade-up">
        <div className="w-16 h-16 mx-auto mb-6 bg-cobalt-soft rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-cobalt"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink mb-3">
          You&apos;re in!
        </h1>
        <p className="text-dust leading-relaxed mb-8">
          Your registration is confirmed. We&apos;ll send you a confirmation email
          with all the details you need.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-cobalt-hover transition-all duration-150 hover:-translate-y-0.5"
        >
          <MoonLogo className="w-4 h-4 [&_path]:stroke-white" />
          Browse More Workshops
        </Link>
      </div>
    </div>
  );
}
