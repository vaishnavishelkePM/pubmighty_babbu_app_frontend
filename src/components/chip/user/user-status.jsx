import { Chip } from '@mui/material';

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
  const v =
    value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  return (
    <Chip size="small" variant="outlined" color={v ? 'success' : 'error'} label={v ? yes : no} />
  );
}
export function TypeChip({ value }) {
  const v = String(value || 'real');
  if (v === 'bot') return <Chip size="small" variant="outlined" color="warning" label="Bot" />;
  return <Chip size="small" variant="outlined" color="success" label="Real" />;
}

export function RegisterChip({ value }) {
  const v = String(value || '-');
  if (v === 'manual') return <Chip size="small" variant="outlined" color="error" label="Manual" />;
  return <Chip size="small" variant="outlined" color="success" label="Gmail" />;
}
export const SORT_BY_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
  { value: 'last_active', label: 'Last Active' },
  { value: 'coins', label: 'Coins' },
  { value: 'total_spent', label: 'Total Spent' },
];

//==========================edit user

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export const LOOKING_FOR = [
  'Long Term',
  'Long Term, Open To Short',
  'Short Term, Open To Long',
  'Short Term Fun',
  'New Friends',
  'Still Figuring Out',
];

export const STATUS = {
  0: 'Pending',
  1: 'Active',
  2: 'Suspended',
  3: 'Disabled',
};

// ----------------------- tabs -----------------------
export const TABS = [
  { value: 'identity', label: 'Identity', icon: 'mdi:account' },
  { value: 'profile', label: 'Profile', icon: 'mdi:card-account-details' },
  { value: 'location', label: 'Location', icon: 'mdi:map-marker' },
  { value: 'images', label: 'Images', icon: 'mdi:image' },

  { value: 'security', label: 'Security', icon: 'mdi:shield-lock' },
];

export const TAB_FIELDS = {
  identity: ['avatar', 'email', 'phone', 'full_name', 'password'],
  profile: ['gender', 'dob', 'looking_for', 'height', 'education', 'bio', 'interests'],
  location: ['country', 'state', 'city', 'address'],
  images: [],

  security: ['status', 'is_active', 'is_verified', 'coins'],
};
//============addUser

export const UserTypes = ['real', 'bot'];
export const RegisterTypes = ['manual', 'gmail'];

export const STATUS_OPTIONS = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Active' },
  { value: 2, label: 'Suspended' },
  { value: 3, label: 'Disabled' },
];

// ----------------------- tabs -----------------------
export const ADD_TABS = [
  { value: 'general', label: 'General', icon: 'mdi:account' },
  { value: 'profile', label: 'Profile Details', icon: 'mdi:account-details' },
  { value: 'location', label: 'Location', icon: 'mdi:map-marker' },
  { value: 'images', label: 'Images', icon: 'mdi:image' },

  { value: 'status', label: 'Status', icon: 'mdi:shield-check' },
];

// for red tab highlight when error exists in that tab
export const ADD_TAB_FIELDS = {
  general: ['avatar', 'full_name', 'password', 'email', 'phone', 'type', 'register_type'],
  profile: ['gender', 'dob', 'bio', 'looking_for', 'height', 'education', 'interests'],
  location: ['country', 'state', 'city', 'address'],
  images: ['media_images'],
  videos: ['media_videos'],
  status: ['status', 'is_active', 'is_verified', 'coins', 'initial_coins'],
};
