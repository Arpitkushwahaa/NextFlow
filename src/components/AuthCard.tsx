'use client';

import React from 'react';

export default function AuthCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center font-semibold">N</div>
        <div className="mt-3 text-white font-medium">Nodefy</div>
      </div>

      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-0 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/95">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">{title ?? 'Sign in to NextFlow'}</h2>
          </div>
        </div>

        <div className="p-6 bg-neutral-900">
          <div className="bg-neutral-800/60 p-4 rounded-lg">{children}</div>
        </div>

        <div className="py-4 text-center text-sm text-neutral-500">
          <a href="/" className="hover:underline">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
