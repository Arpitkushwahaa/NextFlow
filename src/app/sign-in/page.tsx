'use client';

import { SignIn } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';

export default function SignInPage() {
  return (
    <AuthCard title="Sign in to NextFlow">
      <div className="space-y-4">
        <SignIn appearance={{ elements: { card: 'bg-transparent shadow-none' } }} />
      </div>
    </AuthCard>
  );
}
