'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? '/dashboard' : '/sign-in');
  }, [isLoaded, isSignedIn, router]);

  return null;
}
