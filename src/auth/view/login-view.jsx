'use client';

import axios from 'axios';
import { z as zod } from 'zod';
import { toast } from 'react-toastify';
import Turnstile from 'react-turnstile';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { setSessionCookies } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { useAppContext } from 'src/contexts/app-context';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import Altcha from '../components/altcha';
import { FormHead } from '../components/form-head';

// ----------------------------------------------------------------------

export const logInSchema = zod.object({
  login: zod.string().min(3, { message: 'Email/Username is required!' }),
  password: zod.string().min(8, { message: 'Password must be at least 8 characters!' }),
});

const SS_LOGIN_KEY = 'admin_2fa_login';
const SS_PASS_KEY = 'admin_2fa_password';
const SS_METHOD_KEY = 'admin_2fa_method';

export function LoginView({ settings }) {
  const router = useRouter();
  const showPassword = useBoolean();
  const { setUser } = useAppContext();

  const altchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState('');

  const security = settings?.security || {};

  const methods = useForm({
    resolver: zodResolver(logInSchema),
    defaultValues: { login: '', password: '' },
    mode: 'onSubmit',
  });

  const handleCaptcha = (token) => {
    setCaptchaToken(token || '');
  };

  const captchaEnabled =
    security?.admin_login_captcha_enabled === true ||
    security?.admin_login_captcha_enabled === 'true';

  const captchaType = security?.admin_login_captcha;

  const onSubmit = methods.handleSubmit(async (data) => {
    const url = `${CONFIG.apiUrl}/v1/admin/login`;

    let captchaValue = '';

    if (captchaEnabled) {
      if (captchaType === 'altcha') {
        captchaValue = altchaRef.current?.value || '';
      } else {
        captchaValue = captchaToken || '';
      }

      if (!captchaValue) {
        toast.error('Please complete the captcha');
        return;
      }
    }

    try {
      const result = await axios.post(
        url,
        {
          login: data.login,
          password: data.password,
          captchaToken: captchaEnabled ? captchaValue : undefined,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      const res = result?.data;
      console.log('LOGIN RES =>', res);

      if (!res?.success) {
        toast.error(res?.msg || 'Login failed');
        return;
      }

      // 2FA required
      if (res?.requires2FA) {
        sessionStorage.setItem(SS_LOGIN_KEY, data.login);
        sessionStorage.setItem(SS_PASS_KEY, data.password);
        sessionStorage.setItem(SS_METHOD_KEY, String(res?.twoFAMethod || 'email'));

        toast.success(res?.msg || 'OTP required');
        router.push('/login/verify');
        return;
      }

      // normal login
      const token = res?.data?.token;
      const expiresAt = res?.data?.expires_at;

      if (!token) {
        toast.error('Session token missing from response');
        return;
      }

      setSessionCookies(token, expiresAt);

      // if (res?.data?.admin) setUser(res.data.admin);

      // AFTER — write to localStorage DIRECTLY before navigate, don't rely on setUser timing
      toast.success(res?.msg || 'Login successful');

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
          // Write to localStorage FIRST synchronously before navigation
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

      // Small delay to ensure localStorage is written before Next.js remounts the layout
      await new Promise((resolve) => setTimeout(resolve, 50));
      router.push(paths.dashboard.root);
    } catch (err) {
      console.error('Admin login error:', err);
      toast.error(err?.message || 'Network error');
    }
  });

  return (
    <Box>
      <FormHead title="Login to your account" sx={{ textAlign: { xs: 'center', md: 'left' } }} />

      <Form methods={methods} onSubmit={onSubmit} autoComplete="off">
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text
            name="login"
            label="Username/Email address"
            autoComplete="username"
            InputLabelProps={{ shrink: true }}
          />

          <Box gap={1.5} display="flex" flexDirection="column">
            <Field.Text
              name="password"
              label="Password"
              placeholder="8+ characters"
              type={showPassword.value ? 'text' : 'password'}
              autoComplete="current-password"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={showPassword.onToggle} edge="end">
                      <Iconify
                        icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Link
              component={RouterLink}
              href={paths.forgotPassword.root}
              variant="body2"
              color="inherit"
              sx={{ alignSelf: 'flex-end' }}
            >
              Forgot password?
            </Link>
          </Box>

          {/* Captchas */}
          {captchaEnabled && captchaType === 'recaptcha' ? (
            <ReCAPTCHA sitekey={security?.recaptcha_client_key} onChange={handleCaptcha} />
          ) : null}

          {captchaEnabled && captchaType === 'hcaptcha' ? (
            <HCaptcha sitekey={security?.hcaptcha_client_key} onVerify={handleCaptcha} />
          ) : null}

          {captchaEnabled && captchaType === 'turnstile' ? (
            <Turnstile
              sitekey={security?.cloudflare_turnstile_client_key}
              onVerify={handleCaptcha}
            />
          ) : null}

          {captchaEnabled && captchaType === 'altcha' ? <Altcha ref={altchaRef} /> : null}

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={methods.formState.isSubmitting}
            loadingIndicator="Login..."
          >
            Login
          </LoadingButton>
        </Box>
      </Form>
    </Box>
  );
}
