import { Chip } from '@mui/material';

export const LookingFor = [
  'Long Term',
  'Long Term, Open To Short',
  'Short Term, Open To Long',
  'Short Term Fun',
  'New Friends',
  'Still Figuring Out',
];

export const STATUS_OPTIONS = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Active' },
  { value: 2, label: 'Suspended' },
  { value: 3, label: 'Disabled' },
];

// ----------------------- tabs -----------------------
export const TABS = [
  { value: 'general', label: 'General', icon: 'mdi:account' },
  { value: 'profile', label: 'Profile Details', icon: 'mdi:account-details' },
  { value: 'location', label: 'Location', icon: 'mdi:map-marker' },
  { value: 'images', label: 'Images', icon: 'mdi:image' },
  { value: 'videos', label: 'Videos', icon: 'mdi:video' },
  { value: 'status', label: 'Status', icon: 'mdi:shield-check' },
];

// highlight tab in red if error inside it
export const TAB_FIELDS = {
  general: ['avatar', 'full_name', 'email', 'phone', 'password', 'register_type', 'type'],
  profile: ['gender', 'dob', 'bio', 'interests', 'looking_for', 'height', 'education'],
  location: ['country', 'state', 'city', 'address', 'ip_address'],
  media: ['media_images', 'media_videos'], //  NEW
  status: ['status', 'is_active', 'is_verified'],
};
export function StatusChip({ value }) {
  switch (Number(value)) {
    case 0:
      return <Chip label="Pending" color="default" variant="soft" size="small" />;
    case 1:
      return <Chip label="Active" color="success" variant="soft" size="small" />;
    case 2:
      return <Chip label="Suspended" color="warning" variant="soft" size="small" />;
    case 3:
      return <Chip label="Disabled" color="error" variant="soft" size="small" />;
    default:
      return <Chip label="Unknown" color="default" variant="soft" size="small" />;
  }
}

export function YesNoChip({ value, yes = 'Yes', no = 'No' }) {
  const v = value === true || value === 1 || value === '1';
  return (
    <Chip size="small" variant="outlined" color={v ? 'success' : 'error'} label={v ? yes : no} />
  );
}

export const SORT_BY_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
  { value: 'last_active', label: 'Last Active' },
  { value: 'coins', label: 'Coins' },
  { value: 'total_spent', label: 'Total Spent' },
];

const EDIT_TAB_FIELDS = {
  identity: [
    'avatar',

    'email',
    'phone',
    'password',
    'status',
    'is_active',
    'is_verified',
    'is_deleted',
  ],
  profile: ['gender', 'dob', 'bio', 'interests', 'looking_for', 'height', 'education'],
  location: ['country', 'state', 'city', 'address'],
  images: [],
  videos: [],
  status: ['status', 'is_active', 'is_verified', 'is_deleted'],
};

const EDIT_TABS = [
  { value: 'identity', label: 'Identity', icon: 'mdi:account' },
  { value: 'profile', label: 'Profile', icon: 'mdi:card-account-details' },
  { value: 'location', label: 'Location', icon: 'mdi:map-marker' },
  { value: 'images', label: 'Images', icon: 'mdi:image' },
  { value: 'videos', label: 'Videos', icon: 'mdi:video' },
  { value: 'status', label: 'Status', icon: 'mdi:shield-lock' },
];
