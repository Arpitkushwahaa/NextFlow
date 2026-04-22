'use client';

import { SignUp } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';

export default function SignUpPage() {
  return (
    <AuthCard title="Create your NextFlow account">
      <div className="space-y-4">
        <SignUp appearance={{ elements: { card: 'bg-transparent shadow-none' } }} />
      </div>
    </AuthCard>
  );
}
