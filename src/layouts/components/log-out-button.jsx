import { useCallback } from 'react';

import Button from '@mui/material/Button';

import { useRouter } from 'src/routes/hooks';

import { deleteCookie } from 'src/utils/helper';

import { useAppContext } from 'src/contexts/app-context';

// ----------------------------------------------------------------------

export function LogOutButton({ onClose, sx, ...other }) {
  const router = useRouter();
  const { user, setUser } = useAppContext();

  const handleLogout = useCallback(async () => {
    try {
      setUser(null);
      onClose?.();
      deleteCookie("session_key");
      deleteCookie("session_expiration");
      router.push("/login");
    } catch (error) {
      console.error(error);
    }
  }, [onClose, router]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={handleLogout}
      sx={sx}
      {...other}
    >
      Logout
    </Button>
  );
}
