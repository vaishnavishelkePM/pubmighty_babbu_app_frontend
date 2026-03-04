import { AuthSplitLayout } from 'src/layouts/auth-split';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  return (
    <GuestGuard>
      <AuthSplitLayout
        section={{ title: 'Hi, Welcome back', subtitle: 'Turn your traffic into profit.' }}
      >
        {children}
      </AuthSplitLayout>
    </GuestGuard>
  );
}
