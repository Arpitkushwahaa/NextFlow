'use client';

import { SignIn } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';

export default function SignInPage() {
  return (
    <AuthCard title="Log In">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <a className="px-4 py-2 rounded-md bg-neutral-800 text-neutral-300 text-sm font-medium">Log In</a>
          <a href="/sign-up" className="px-4 py-2 rounded-md text-sm text-neutral-400 hover:bg-neutral-800">Sign Up</a>
        </div>

        <SignIn appearance={{ elements: { card: 'bg-transparent shadow-none' } }} />
      </div>
    </AuthCard>
  );
}
