"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const clerkAppearance = {
  variables: {
    colorBackground: "#1c1c1c",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.5)",
    colorInputBackground: "#262626",
    colorInputText: "#ffffff",
    colorNeutral: "#737373",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "14px",
  },
  elements: {
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    card: "!bg-transparent !shadow-none !rounded-none !border-0",
    footer: "!bg-transparent !rounded-none",
    formFieldRow__firstName: "hidden",
    formFieldRow__lastName: "hidden",
    badge: "!hidden",
    lastAuthenticationStrategyBadge: "!hidden",
  },
};

type Tab = "sign-in" | "sign-up";

export default function AuthPageClient({ initialTab }: { initialTab: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [contentVisible, setContentVisible] = useState(true);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) return null;

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    setContentVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      router.replace(tab === "sign-in" ? "/sign-in" : "/sign-up", { scroll: false });
      setContentVisible(true);
    }, 110);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
      {/* Horizontal logo */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-black text-lg shrink-0">
          N
        </div>
        <span className="text-white text-xl font-semibold">NextFlow</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#1c1c1c] rounded-2xl overflow-hidden">

        {/* Tab row with sliding pill indicator */}
        <div className="relative flex gap-1.5 p-3">
          {/* Sliding background pill */}
          <div
            className="absolute top-3 bottom-3 bg-[#2e2e2e] rounded-lg"
            style={{
              width: "calc(50% - 9px)",
              left: "12px",
              transform: activeTab === "sign-in" ? "translateX(0)" : "translateX(calc(100% + 6px))",
              transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />

          <button
            onClick={() => switchTab("sign-in")}
            className="relative z-10 flex-1 py-2.5 text-center text-sm font-medium rounded-lg"
            style={{
              color: activeTab === "sign-in" ? "#ffffff" : "rgba(255,255,255,0.38)",
              transition: "color 200ms ease",
            }}
          >
            Log In
          </button>

          <button
            onClick={() => switchTab("sign-up")}
            className="relative z-10 flex-1 py-2.5 text-center text-sm font-medium rounded-lg"
            style={{
              color: activeTab === "sign-up" ? "#ffffff" : "rgba(255,255,255,0.38)",
              transition: "color 200ms ease",
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Clerk form — fades on tab switch */}
        <div
          className="px-4 pb-2"
          style={{
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 110ms ease, transform 110ms ease",
          }}
        >
          {activeTab === "sign-in" ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </div>
      </div>

      {/* Back link */}
      <p className="mt-5 text-sm text-neutral-600">
        <a href="/" className="hover:text-neutral-400 transition-colors">
          ← Back to home
        </a>
      </p>
    </div>
  );
}
