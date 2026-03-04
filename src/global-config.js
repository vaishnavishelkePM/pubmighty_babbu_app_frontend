import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export const CONFIG = {
  appName: 'Dating Admin',
  appVersion: packageJson.version,
  apiUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
  assetsDir: process.env.NEXT_PUBLIC_ASSETS_DIR ?? '',
  assetsUrl: process.env.NEXT_PUBLIC_ASSETS_SERVER_URL ?? '',
  auth: {
    redirectPath: '/login',
  },
};
