import { CONFIG } from 'src/global-config';

import ForgotPasswordView from 'src/auth/view/forgot-password-view';


export const metadata = {
  title: `Forgot Password - ${CONFIG.appName}`,
};

export default function ForgotPasswordPage() {

  return <ForgotPasswordView />;
}
