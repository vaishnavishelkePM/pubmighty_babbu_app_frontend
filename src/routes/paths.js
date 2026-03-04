// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  faqs: '/faqs',
  // AUTH
  login: {
    root: `/login`,
    verify: `/login/verify`,
  },
  forgotPassword: {
    root: `/forgot-password`,
    verify: `/forgot-password/verify`,
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    admins: {
      root: `${ROOTS.DASHBOARD}/admins`,
      add: `${ROOTS.DASHBOARD}/admins/add`,
      edit: (id) => `${ROOTS.DASHBOARD}/admins/edit/${id}`,
    },
    profile: {
      root: `${ROOTS.DASHBOARD}/profile`,
      update: `${ROOTS.DASHBOARD}/profile/update`,
    },
    users: {
      root: `${ROOTS.DASHBOARD}/users`,
      add: `${ROOTS.DASHBOARD}/users/add`,
      edit: (id) => `${ROOTS.DASHBOARD}/users/edit/${id}`,
      view: (id) => `${ROOTS.DASHBOARD}/users/view/${id}`,
    },

    adminChat: {
      root: '/dashboard/admin-chat',
    },
    bots: {
      root: `${ROOTS.DASHBOARD}/bots`,
      add: `${ROOTS.DASHBOARD}/bots/add`,
      edit: (id) => `${ROOTS.DASHBOARD}/bots/edit/${id}`,
      view: (id) => `${ROOTS.DASHBOARD}/bots/view/${id}`,
    },
    coinPackages: {
      root: `${ROOTS.DASHBOARD}/coin-packages`,
      add: `${ROOTS.DASHBOARD}/coin-packages/add`,
      edit: (id) => `${ROOTS.DASHBOARD}/coin-packages/edit/${id}`,
      view: (id) => `${ROOTS.DASHBOARD}/coin-packages/${id}`,
    },
    coinTransactions: {
      purchase: `${ROOTS.DASHBOARD}/transaction/purchase-transaction`,
      spent: `${ROOTS.DASHBOARD}/transaction/coin-transaction`,
    },

    settings: {
      root: `${ROOTS.DASHBOARD}/settings`,
      edit: (id) => `${ROOTS.DASHBOARD}/settings/${id}`,
    },
    reports: {
      root: `${ROOTS.DASHBOARD}/reports`,
    },

    notifications: {
      root: `${ROOTS.DASHBOARD}/notifications`,
      add: `${ROOTS.DASHBOARD}/notifications/add`,
      global: '/dashboard/notifications/global',
      single: '/dashboard/notifications/single',
    },
    notificationCategory: {
      root: `${ROOTS.DASHBOARD}/notification-category`,
    },
    masterPrompts: {
      root: `${ROOTS.DASHBOARD}/master-prompts`,
      add: `${ROOTS.DASHBOARD}/master-prompts/add`,
    },
    settings: {
      root: `${ROOTS.DASHBOARD}/settings`,
    },
    security: {
      root: `${ROOTS.DASHBOARD}/security`,
    },
    videoCall: {
      root: `${ROOTS.DASHBOARD}/calls`,
    },
    summary: {
      root: `${ROOTS.DASHBOARD}/summary`,
    },
    adView: {
      root: `${ROOTS.DASHBOARD}/ad-view`,
    },
  },
};
