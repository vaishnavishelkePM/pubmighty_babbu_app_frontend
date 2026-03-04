import { redirect } from 'next/navigation';

import { CONFIG } from 'src/global-config';

import { LoginView } from 'src/auth/view';

export const metadata = {
  title: `Login - ${CONFIG.appName}`,
  description: 'Login to your account.',
};

export default async function LoginPage() {
  let redirectPath = null; 
  try {
    // Fetch data
    const [response] = await Promise.all([
      fetch(`${CONFIG.apiUrl}/v1/admin/settings`, {
        cache: 'no-store', //disable Next.js caching
      }).then((res) => res.json()),
    ]);

    if (response.success) {
      const settings = response.data;
      console.warn(settings);
      return <LoginView settings={settings} />;
    } else {
      return <p>{response.msg}</p>;
    }
  } catch (error) {
    console.error('Error during LoginPage:', error);
    redirectPath = '/404';
  }

  // Perform  AFTER try/catch block
  if (redirectPath) {
    redirect(redirectPath);
  }
}
