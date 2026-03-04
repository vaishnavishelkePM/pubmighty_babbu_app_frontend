// 'use client';

// import axios from 'axios';
// import { z as zod } from 'zod';
// import { useCallback } from 'react';
// import { toast } from 'react-toastify';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';

// import Box from '@mui/material/Box';
// import LoadingButton from '@mui/lab/LoadingButton';

// import { paths } from 'src/routes/paths';
// import { useRouter } from 'src/routes/hooks';

// import { useCountdownSeconds } from 'src/hooks/use-countdown';

// import { getCookie, deleteCookie, setSessionCookies } from 'src/utils/helper';

// import { CONFIG } from 'src/global-config';
// import { EmailInboxIcon } from 'src/assets/icons';
// import { useAppContext } from 'src/contexts/app-context';

// import { Form, Field } from 'src/components/hook-form';

// import { FormHead } from '../components/form-head';
// import { FormReturnLink } from '../components/form-return-link';
// import { FormResendCode } from '../components/form-resend-code';

// // ----------------------------------------------------------------------

// const loginVerifySchema = zod.object({
//   otp: zod.string().min(6, { message: 'OTP must be at least 6 characters!' }),
//   login: zod.string().min(1, { message: 'Username/Email is required!' }),
// });

// // ----------------------------------------------------------------------

// // export default function LoginVerifyView() {
// //   const router = useRouter();
// //   const { user, setUser } = useAppContext();

// //   const login = getCookie('login');
// //   const password = getCookie('password');
// //   const action = getCookie('action');

// //   const countdown = useCountdownSeconds(60);

// //   const methods = useForm({
// //     resolver: zodResolver(loginVerifySchema),
// //     defaultValues: { otp: '', login },
// //   });

// //   const {
// //     handleSubmit,
// //     formState: { errors, isSubmitting },
// //   } = methods;

// //   const onSubmit = handleSubmit(async (data) => {
// //     try {
// //       const payload = {
// //         login,
// //         otp: data.otp,
// //         action,
// //         password,
// //       };

// //       const result = await axios.post(`${CONFIG.apiUrl}/api/v1/login/verify`, payload, {
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         validateStatus: () => true,
// //       });

// //       const res = result.data.data;

// //       if (result.data.isGood) {
// //         deleteCookie('login');
// //         deleteCookie('action');
// //         deleteCookie('password');
// //         localStorage.setItem('user', JSON.stringify(res.user));
// //         setSessionCookies(res.session_key, res.session_expiration);
// //         setUser(res.user);
// //         toast.success(result.data.msg);
// //         router.push(paths.dashboard.root);
// //       } else {
// //         toast.error(result.data.msg);
// //       }
// //     } catch (err) {
// //       console.error('Error during onSubmit in login verify action:', errors);
// //       toast.error('Internal Server Error');
// //     }
// //   });

// //   const handleResendCode = useCallback(async () => {
// //     if (!countdown.isCounting) {
// //       try {
// //         countdown.reset();
// //         countdown.start();

// //         const payload = {
// //           login,
// //           action,
// //         };

// //         const result = await axios.post(`${CONFIG.apiUrl}/api/v1/resend-send-otp`, payload, {
// //           headers: {
// //             'Content-Type': 'application/json',
// //           },
// //           validateStatus: () => true,
// //         });
// //         if (result.data.isGood) {
// //           toast.success(result.data.msg);
// //         } else {
// //           toast.error(result.data.msg);
// //         }
// //       } catch (err) {
// //         console.error('Error during handleResendCode in login verify action:', errors);
// //         toast.error('Internal Server Error');
// //       }
// //     }

// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [countdown]);

// //   const renderForm = (
// //     <Box gap={3} display="flex" flexDirection="column">
// //       <Field.Text
// //         name="login"
// //         label="Username/Email address"
// //         placeholder="example@gmail.com"
// //         InputLabelProps={{ shrink: true }}
// //         disabled
// //       />

// //       <Field.Code name="otp" />

// //       <LoadingButton
// //         fullWidth
// //         size="large"
// //         type="submit"
// //         variant="contained"
// //         loading={isSubmitting}
// //         loadingIndicator="Verify..."
// //       >
// //         Verify
// //       </LoadingButton>
// //     </Box>
// //   );

// //   return (
// //     <>
// //       <FormHead
// //         icon={<EmailInboxIcon />}
// //         title="Verify Login!"
// //         description="Please verify your login using the OTP."
// //       />

// //       <Form methods={methods} onSubmit={onSubmit}>
// //         {renderForm}
// //       </Form>

// //       <FormResendCode
// //         onResendCode={handleResendCode}
// //         value={countdown.value}
// //         disabled={countdown.isCounting}
// //       />

// //       <FormReturnLink label="Return to login" href={paths.login.root} />
// //     </>
// //   );
// // }

// export default function LoginVerifyView() {
//   const router = useRouter();
//   const { setUser } = useAppContext();

//   const methods = useForm({
//     defaultValues: { otp: '' },
//   });

//   const onSubmit = methods.handleSubmit(async (data) => {
//     try {
//       const login = getCookie('otp_login');
//       const otp = data.otp;

//       if (!login) {
//         toast.error('Login session missing. Please login again.');
//         router.push(paths.login.root);
//         return;
//       }

//       const url = `${CONFIG.apiUrl}/v1/admin/login/verify`;
//       const payload = { login, otp };

//       const result = await axios.post(url, payload, {
//         headers: { 'Content-Type': 'application/json' },
//         validateStatus: () => true,
//       });

//       const res = result.data;
//       console.log('VERIFY STATUS:', result.status);
//       console.log('VERIFY RESPONSE:', res);
//       if (!res?.success) {
//         toast.error(res?.msg || 'OTP verification failed');
//         return;
//       }

//       const token = res?.data?.token || res?.data?.session_key;
//       const expiresAt = res?.data?.expiresAt || res?.data?.session_expiration;

//       if (!token) {
//         toast.error('Token missing after verification');
//         return;
//       }

//       setSessionCookies(token, expiresAt);
//       if (res?.data?.admin) setUser(res.data.admin);

//       // cleanup cookies
//       deleteCookie('otp_login');
//       deleteCookie('otp_admin_id');
//       deleteCookie('otp_method');

//       toast.success(res?.msg || 'Login verified');
//       router.push(paths.dashboard.root);
//     } catch (err) {
//       console.error('Verify login error:', err);
//       toast.error(err.message || 'Something went wrong');
//     }
//   });

//   return (
//     <Box>
//       <FormHead title="Verify OTP" sx={{ textAlign: { xs: 'center', md: 'left' } }} />

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
//         </Box>
//       </Form>
//     </Box>
//   );
// }

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

      // your verify returns: data.admin
      if (res?.data?.admin) setUser(res.data.admin);

      //  cleanup
      sessionStorage.removeItem(SS_LOGIN_KEY);
      sessionStorage.removeItem(SS_PASS_KEY);
      sessionStorage.removeItem(SS_METHOD_KEY);
      sessionStorage.removeItem(SS_ADMINID_KEY);

      toast.success(res?.msg || 'Login verified');
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
