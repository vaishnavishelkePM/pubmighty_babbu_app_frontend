import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
  page: icon('ic-page'),
  departments: icon('ic-departments'),
  position: icon('ic-position'),
  jobs: icon('ic-jobs'),
  holidays: icon('ic-holidays'),
  coins: icon('ic-coins'),
  bots: icon('ic-bot'),
  purchase: icon('ic-purchase'),
  reports: icon('ic-reports'),
  notification: icon('ic-notification'),
  prompt: icon('ic-prompt'),
  category: icon('ic-category'),
  settings: icon('ic-settings'),
  spent: icon('ic-spent'),
  security: icon('ic-security'),
  video: icon('ic-video'),
  call: icon('ic-call'),
  report: icon('ic-report'),
  ad: icon('ic-ads'),
};

// ----------------------------------------------------------------------

export const navData = [
  {
    subheader: 'Overview',
    items: [
      {
        title: 'Dashboard',
        path: paths.dashboard.root,
        icon: ICONS.dashboard,
      },
    ],
  },
  /**
   * Management
   */
  {
    subheader: 'Bot Management',
    items: [
      {
        title: 'Bots',
        path: paths.dashboard.bots.root,
        icon: ICONS.bots,
      },

      {
        title: 'Chat',
        path: paths.dashboard.adminChat.root,
        icon: ICONS.chat,
      },
      {
        title: 'Call Records',
        path: paths.dashboard.videoCall.root,
        icon: ICONS.call,
      },

      {
        title: 'Master Prompts',
        path: paths.dashboard.masterPrompts.root,
        icon: ICONS.prompt,
      },

      {
        title: 'AdView',
        path: paths.dashboard.adView.root,
        icon: ICONS.ad,
      },

      {
        title: 'Reports',
        path: paths.dashboard.reports.root,
        icon: ICONS.reports,
      },
    ],
  },

  {
    subheader: ' User Management',
    items: [
      {
        title: 'Users',
        path: paths.dashboard.users.root,
        icon: ICONS.user,
      },
      {
        title: 'Coin Packages',
        path: paths.dashboard.coinPackages.root,
        icon: ICONS.purchase,
      },

      {
        title: 'Notifications',
        path: paths.dashboard.notifications.root,
        icon: ICONS.notification,
        children: [
          {
            title: 'Global Notifications',
            path: paths.dashboard.notifications.global,
          },
          {
            title: 'Single User Notifications',
            path: paths.dashboard.notifications.single,
          },
        ],
      },
      {
        title: 'Notification Categories',
        path: paths.dashboard.notificationCategory.root,
        icon: ICONS.category,
      },
    ],
  },

  /**
   * Site
   *
   */
  {
    subheader: 'Transaction',
    items: [
      {
        title: 'Coin Purchase',
        path: paths.dashboard.coinTransactions.purchase,
        icon: ICONS.coins,
      },
      {
        title: 'Coin Spent',
        path: paths.dashboard.coinTransactions.spent,
        icon: ICONS.spent,
      },
    ],
  },
  {
    subheader: 'Site',
    items: [
      {
        title: 'Settings',
        path: paths.dashboard.settings.root,
        icon: ICONS.settings,
      },
      {
        title: 'Security',
        path: paths.dashboard.security.root,
        icon: ICONS.security,
      },
      {
        title: 'Performance Analytics',
        path: paths.dashboard.summary.root,
        icon: ICONS.report,
      },
    ],
  },
  {
    subheader: 'Profile',
    items: [
      {
        title: 'Admins',
        path: paths.dashboard.admins.root,
        icon: ICONS.lock,
      },
    ],
  },
];
