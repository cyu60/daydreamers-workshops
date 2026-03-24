"use client";

import { useState } from "react";

export function CheckoutButton({
  workshopId,
  workshopTitle,
  disabled,
  soldOut,
}: {
  workshopId: string;
  workshopTitle: string;
  disabled: boolean;
  soldOut: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={`w-full py-3.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-150 ${
        soldOut
          ? "bg-ink/10 text-dust cursor-not-allowed"
          : disabled
            ? "bg-cobalt/40 text-white/70 cursor-not-allowed"
            : "bg-cobalt text-white hover:bg-cobalt-hover hover:-translate-y-0.5 active:translate-y-0"
      }`}
    >
      {loading
        ? "Redirecting..."
        : soldOut
          ? "Sold Out"
          : "Register & Pay"}
    </button>
  );
}
