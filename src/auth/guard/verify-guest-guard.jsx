'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'src/routes/hooks';

import { getCookie } from 'src/utils/helper';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

export function VerifyGuestGuard({ children }) {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);

  const checkSession = async () => {
    if (!getCookie('login') || !getCookie('action') || !getCookie('password')) {
      router.back();
    } else {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
