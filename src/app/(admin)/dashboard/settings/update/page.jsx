import { CONFIG } from 'src/global-config';

import UpdateProfile from 'src/sections/dashboard/profile/update-profile';

// ----------------------------------------------------------------------

export const metadata = { title: `Update Profile - ${CONFIG.appName}` };

export default function UpdateProfilePage() {
  return <UpdateProfile />;
}
