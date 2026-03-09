
'use client';

import axios from 'axios';
import { z as zod } from 'zod';
import { toast } from 'react-toastify';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { setCookie } from 'minimal-shared';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { Form, Field } from 'src/components/hook-form';

import { FormHead } from '../components/form-head';

// --- schema matches backend (email required)
const forgotSchema = zod.object({
  email: zod.string().email({ message: 'Enter a valid email address!' }),
});

export default function ForgotPasswordView() {
  const router = useRouter();

  // keep for future captcha
  const altchaRef = useRef(null);
  const [captchaToken] = useState('');

  const methods = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  const onSubmit = methods.handleSubmit(async (data) => {
    const captchaValue = captchaToken || altchaRef.current?.value || undefined;

    const url = `${CONFIG.apiUrl}/v1/admin/forgot-password`;

    try {
      const result = await axios.post(
        url,
        {
          email: data.email,
          captchaToken: captchaValue,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      const res = result.data;

      if (!res?.success) {
        toast.error(res?.msg || 'Failed to send OTP');
        return;
      }

      setCookie('fp_email', data.email, { sameSite: 'lax' });
      setCookie('fp_action', 'forgot_password', { sameSite: 'lax' });

      toast.success(res?.msg || 'OTP sent');
      router.push(paths.forgotPassword.verify);
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(err?.message || 'Network error');
    }
  });

  return (
    <Box>
      <FormHead title="Forgot password?" sx={{ textAlign: { xs: 'center', md: 'left' } }} />

      <Form methods={methods} onSubmit={onSubmit} autoComplete="off">
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text
            name="email"
            label="Email address"
            autoComplete="off"
            InputLabelProps={{ shrink: true }}
          />

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={methods.formState.isSubmitting}
            loadingIndicator="Sending..."
          >
            Send reset code
          </LoadingButton>

          <Link
            href={paths.login.root}
            variant="body2"
            color="inherit"
            sx={{ alignSelf: 'flex-end' }}
          >
            Return to login
          </Link>
        </Box>
      </Form>
    </Box>
  );
}
