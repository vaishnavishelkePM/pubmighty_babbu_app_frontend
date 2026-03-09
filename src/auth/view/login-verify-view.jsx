
'use client';

import axios from 'axios';
import { z as zod } from 'zod';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { setSessionCookies } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { useAppContext } from 'src/contexts/app-context';

import { Form, Field } from 'src/components/hook-form';

import { FormHead } from '../components/form-head';

// ----------------------------------------------------------------------

const verifySchema = zod.object({
  otp: zod
    .string()
    .min(6, { message: 'OTP must be 6 digits' })
    .max(6, { message: 'OTP must be 6 digits' }),
});

const SS_LOGIN_KEY = 'admin_2fa_login';
const SS_PASS_KEY = 'admin_2fa_password';
const SS_METHOD_KEY = 'admin_2fa_method';
const SS_ADMINID_KEY = 'admin_2fa_adminId';

export default function LoginVerifyView() {
  const router = useRouter();
  const { setUser } = useAppContext();

  const login = useMemo(
    () => (typeof window !== 'undefined' ? sessionStorage.getItem(SS_LOGIN_KEY) : ''),
    []
  );
  const password = useMemo(
    () => (typeof window !== 'undefined' ? sessionStorage.getItem(SS_PASS_KEY) : ''),
    []
  );
  const method = useMemo(
    () => (typeof window !== 'undefined' ? sessionStorage.getItem(SS_METHOD_KEY) : ''),
    []
  );
  const adminId = useMemo(
    () => (typeof window !== 'undefined' ? sessionStorage.getItem(SS_ADMINID_KEY) : ''),
    []
  );

  useEffect(() => {
    // If verify page opened directly, send back to login
    if (!login || !password) {
      toast.error('Login session missing. Please login again.');
      router.push(paths.login.root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const methodsForm = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: '' },
    mode: 'onSubmit',
  });

  const onSubmit = methodsForm.handleSubmit(async (data) => {
    const url = `${CONFIG.apiUrl}/v1/admin/login/verify`;

    try {
      const result = await axios.post(
        url,
        {
          login,
          otp: data.otp,
          password, //  REQUIRED by your backend
          // adminId not required by backend currently, but you can pass if you want:
          // adminId: adminId || undefined,
          // method: method || undefined,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      const res = result?.data;

      if (!res?.success) {
        toast.error(res?.msg || 'OTP verification failed');
        return;
      }

      const token = res?.data?.token || res?.data?.session_key;
      const expiresAt =
        res?.data?.expires_at || res?.data?.expiresAt || res?.data?.session_expiration;

      if (!token) {
        toast.error('Token missing after verification');
        return;
      }

      setSessionCookies(token, expiresAt);

      // cleanup
      sessionStorage.removeItem(SS_LOGIN_KEY);
      sessionStorage.removeItem(SS_PASS_KEY);
      sessionStorage.removeItem(SS_METHOD_KEY);
      sessionStorage.removeItem(SS_ADMINID_KEY);

      toast.success(res?.msg || 'Login verified');

      // Fetch full profile (has avatar) before navigating
      try {
        const profileRes = await axios.get(`${CONFIG.apiUrl}/v1/admin/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        });

        const userData =
          profileRes?.data?.success && profileRes?.data?.data
            ? profileRes.data.data
            : res?.data?.admin || null;

        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
      } catch {
        const fallback = res?.data?.admin || null;
        if (fallback) {
          localStorage.setItem('user', JSON.stringify(fallback));
          setUser(fallback);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
      router.push(paths.dashboard.root);
    } catch (err) {
      console.error('Verify login error:', err);
      toast.error(err?.message || 'Something went wrong');
    }
  });

  return (
    <Box>
      <FormHead
        title="Verify OTP"
        description={
          method === 'auth_app'
            ? 'Enter the code from your authenticator app.'
            : 'Enter the 6-digit OTP sent to your email.'
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      <Form methods={methodsForm} onSubmit={onSubmit} autoComplete="off">
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text
            name="otp"
            label="Enter 6-digit OTP"
            placeholder="123456"
            InputLabelProps={{ shrink: true }}
            autoComplete="one-time-code"
          />

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={methodsForm.formState.isSubmitting}
            loadingIndicator="Verifying..."
          >
            Verify
          </LoadingButton>
        </Box>
      </Form>
    </Box>
  );
}
