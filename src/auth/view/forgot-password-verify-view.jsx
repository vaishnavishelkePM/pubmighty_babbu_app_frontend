// 'use client';

// import axios from 'axios';
// import { z as zod } from 'zod';
// import { useCallback } from 'react';
// import { toast } from 'react-toastify';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';

// import Box from '@mui/material/Box';
// import Link from '@mui/material/Link';
// import LoadingButton from '@mui/lab/LoadingButton';

// import { paths } from 'src/routes/paths';
// import { useRouter } from 'src/routes/hooks';

// import { useCountdownSeconds } from 'src/hooks/use-countdown';

// import { getCookie } from 'src/utils/helper';

// import { CONFIG } from 'src/global-config';

// import { Form, Field } from 'src/components/hook-form';

// import { FormHead } from '../components/form-head';

// const verifySchema = zod.object({
//   otp: zod.string().min(6, { message: 'OTP must be 6 digits!' }),
// });

// export default function ForgotPasswordVerifyView() {
//   const router = useRouter();
//   const countdown = useCountdownSeconds(60);

//   const methods = useForm({
//     resolver: zodResolver(verifySchema),
//     defaultValues: { otp: '' },
//     mode: 'onSubmit',
//   });

//   const email = getCookie('fp_email');

//   const onSubmit = methods.handleSubmit(async (data) => {
//     try {
//       if (!email) {
//         toast.error('Email missing. Please go back and request OTP again.');
//         router.push(paths.forgotPassword.root);
//         return;
//       }

//       const url = `${CONFIG.apiUrl}/v1/admin/forgot-password/verify`;
//       const payload = { email, otp: data.otp };

//       const result = await axios.post(url, payload, {
//         headers: { 'Content-Type': 'application/json' },
//         validateStatus: () => true,
//       });

//       const res = result.data;

//       if (!res?.success) {
//         toast.error(res?.msg || 'OTP verification failed');
//         return;
//       }

//       toast.success(res?.msg || 'OTP verified');
//       //  Next step: go to update password page (or show reset form)
//       router.push(paths.forgotPassword.update);
//     } catch (err) {
//       console.error('Verify error:', err);
//       toast.error(err.message || 'Network error');
//     }
//   });

//   const handleResend = useCallback(async () => {
//     try {
//       if (countdown.isCounting) return;

//       if (!email) {
//         toast.error('Email missing. Please go back and request OTP again.');
//         router.push(paths.forgotPassword.root);
//         return;
//       }

//       countdown.reset();
//       countdown.start();

//       const url = `${CONFIG.apiUrl}/forgot-password`; //  same send-otp route
//       const payload = { email };

//       const result = await axios.post(url, payload, {
//         headers: { 'Content-Type': 'application/json' },
//         validateStatus: () => true,
//       });

//       const res = result.data;

//       if (!res?.success) {
//         toast.error(res?.msg || 'Failed to resend OTP');
//         return;
//       }

//       toast.success(res?.msg || 'OTP resent');
//     } catch (err) {
//       console.error('Resend error:', err);
//       toast.error(err.message || 'Network error');
//     }
//   }, [countdown, email, router]);

//   return (
//     <Box>
//       <FormHead title="Verify reset code" sx={{ textAlign: { xs: 'center', md: 'left' } }} />

//       <Form methods={methods} onSubmit={onSubmit} autoComplete="off">
//         <Box gap={3} display="flex" flexDirection="column">
//           <Field.Text
//             name="otp"
//             label="Enter 6-digit OTP"
//             placeholder="123456"
//             InputLabelProps={{ shrink: true }}
//           />

//           <LoadingButton
//             fullWidth
//             color="inherit"
//             size="large"
//             type="submit"
//             variant="contained"
//             loading={methods.formState.isSubmitting}
//             loadingIndicator="Verifying..."
//           >
//             Verify
//           </LoadingButton>

//           <LoadingButton
//             fullWidth
//             color="inherit"
//             size="large"
//             variant="outlined"
//             onClick={handleResend}
//             disabled={countdown.isCounting}
//           >
//             {countdown.isCounting ? `Resend in ${countdown.value}s` : 'Resend code'}
//           </LoadingButton>

//           <Link
//             href={paths.login.root}
//             variant="body2"
//             color="inherit"
//             sx={{ alignSelf: 'flex-end' }}
//           >
//             Return to login
//           </Link>
//         </Box>
//       </Form>
//     </Box>
//   );
// }

'use client';

import axios from 'axios';
import { z as zod } from 'zod';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getCookie, deleteCookie } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { FormHead } from '../components/form-head';

const verifySchema = zod.object({
  email: zod.string().email({ message: 'Email is required!' }),
  otp: zod.string().length(6, { message: 'OTP must be 6 digits!' }),
  password: zod.string().min(8, { message: 'Password must be at least 8 characters!' }),
});

export default function ForgotPasswordVerifyView() {
  const router = useRouter();
  const showPassword = useBoolean();

  const savedEmail = getCookie('fp_email') || '';

  const methods = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: savedEmail,
      otp: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  // If user refreshes and email cookie missing -> go back
  useEffect(() => {
    if (!savedEmail) {
      toast.error('Email session missing. Please try again.');
      router.push(paths.forgotPassword.root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = methods.handleSubmit(async (data) => {
    const url = `${CONFIG.apiUrl}/v1/admin/forgot-password/verify`;

    try {
      const result = await axios.post(
        url,
        {
          email: data.email,
          otp: data.otp,
          password: data.password,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      const res = result.data;

      if (!res?.success) {
        toast.error(res?.msg || 'OTP verification failed');
        return;
      }

      // cleanup
      deleteCookie('fp_email');
      deleteCookie('fp_action');

      toast.success(res?.msg || 'Password updated');
      router.push(paths.login.root);
    } catch (err) {
      console.error('Forgot verify error:', err);
      toast.error(err?.message || 'Network error');
    }
  });

  return (
    <Box>
      <FormHead title="Verify reset code" sx={{ textAlign: { xs: 'center', md: 'left' } }} />

      <Form methods={methods} onSubmit={onSubmit} autoComplete="off">
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text
            name="email"
            label="Email address"
            disabled
            InputLabelProps={{ shrink: true }}
          />

          <Field.Text
            name="otp"
            label="OTP"
            placeholder="123456"
            InputLabelProps={{ shrink: true }}
          />

          <Field.Text
            name="password"
            label="New password"
            placeholder="8+ characters"
            type={showPassword.value ? 'text' : 'password'}
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

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={methods.formState.isSubmitting}
            loadingIndicator="Updating..."
          >
            Update password
          </LoadingButton>

          <Link
            href={paths.forgotPassword.root}
            variant="body2"
            color="inherit"
            sx={{ alignSelf: 'flex-end' }}
          >
            Back
          </Link>
        </Box>
      </Form>
    </Box>
  );
}
