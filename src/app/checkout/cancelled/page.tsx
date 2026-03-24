import Link from "next/link";

export default function CheckoutCancelled() {
  return (
    <div className="max-w-lg mx-auto px-8 py-24 text-center">
      <div className="fade-up">
        <div className="w-16 h-16 mx-auto mb-6 bg-gold-soft rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink mb-3">
          Payment cancelled
        </h1>
        <p className="text-dust leading-relaxed mb-8">
          No worries — your spot hasn&apos;t been reserved. You can always come
          back when you&apos;re ready.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-cobalt-hover transition-all duration-150 hover:-translate-y-0.5"
        >
          Back to Workshops
        </Link>
      </div>
    </div>
  );
}
