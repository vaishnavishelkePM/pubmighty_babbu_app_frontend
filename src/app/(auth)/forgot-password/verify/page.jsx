import { CONFIG } from 'src/global-config';

import ForgotPasswordVerifyView from 'src/auth/view/forgot-password-verify-view';

export const metadata = {
  title: `Verify OTP - ${CONFIG.appName}`,
};

export default function ForgotPasswordVerifyPage() {
 
  return <ForgotPasswordVerifyView />;
}
