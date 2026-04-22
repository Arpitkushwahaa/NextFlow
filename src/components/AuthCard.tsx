'use client';

import React from 'react';

export default function AuthCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-[#0b0b0b] to-black p-6">
      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">{title ?? 'Sign in to NextFlow'}</h2>
          <p className="text-sm text-neutral-400 mt-1">Welcome back — sign in to continue</p>
        </div>

        <div className="bg-neutral-800/60 p-5 rounded-xl">{children}</div>

        <div className="mt-4 text-xs text-neutral-500 text-center">
          <span>By continuing you agree to our Terms and Privacy.</span>
        </div>
      </div>
    </div>
  );
}
