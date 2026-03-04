'use client';

import { getCookie } from 'minimal-shared';
import { useState, useEffect } from 'react';

import { useRouter } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';


// ----------------------------------------------------------------------

export function GuestGuard({ children }) {
    const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  const isSessionExpired = () => {
    const sessionExpiration = getCookie('session_expiration');
    if (!sessionExpiration) return true;
    const currentTime = new Date().getTime();
    const expirationTime = new Date(sessionExpiration).getTime();
    return currentTime > expirationTime;
  };

  const checkSession = async () => {
    const sessionExpired = isSessionExpired();
    // console.log(sessionExpired);
    if (
      getCookie('session_key') &&
      getCookie('session_expiration') &&
      localStorage.getItem('user')
    ) {
      if (!sessionExpired) {
        // If session vaild, redirect to dashboard page
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
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
