import { CONFIG } from 'src/global-config';

import LoginVerifyView from 'src/auth/view/login-verify-view';


export const metadata = {
  title: `Verify Login - ${CONFIG.appName}`,
  description: 'Please verify your login using the OTP.',
};

export default async function LoginVerifyPage() {
 

  return <LoginVerifyView />;
}
