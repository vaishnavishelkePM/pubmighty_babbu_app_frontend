'use client';

import { z } from 'zod';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import AlertTitle from '@mui/material/AlertTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';

import { paths } from 'src/routes/paths';

import { heightStringToInt } from 'src/utils/user-helper';
import { isBlank, safeJoin, appendIfSet } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import CitySelector from 'src/components/selectors/city-selector';
import StateSelector from 'src/components/selectors/state-selector';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CountrySelector from 'src/components/selectors/country-selector';
import {
  ADD_TABS,
  UserTypes,
  LOOKING_FOR,
  RegisterTypes,
  STATUS_OPTIONS,
  ADD_TAB_FIELDS,
} from 'src/components/chip/user/user-status';



// ----------------------- validation -----------------------

const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include at least 1 uppercase letter (A-Z)')
  .regex(/[a-z]/, 'Password must include at least 1 lowercase letter (a-z)')
  .regex(/[0-9]/, 'Password must include at least 1 number (0-9)');

const Schema = z
  .object({
    password: PasswordSchema,

    email: z.string().trim().email('Valid email required').optional().or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{7,15}$/, 'Phone must be 7-15 digits (optional +)')
      .optional()
      .or(z.literal('')),

    full_name: z.string().trim().max(300).optional().or(z.literal('')),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),

    dob: z
      .any()
      .optional()
      .nullable()
      .refine((v) => {
        if (!v) return true;
        return dayjs(v).isValid();
      }, 'Invalid DOB'),

    bio: z.string().trim().optional().or(z.literal('')),
    looking_for: z.enum(LOOKING_FOR).optional().or(z.literal('')),
    height: z.string().optional().or(z.literal('')),
    education: z.string().trim().max(200).optional().or(z.literal('')),
    interests: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => {
        const raw = String(v || '').trim();
        if (!raw) return true;
        const items = raw
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        return items.length <= 6;
      }, 'Max 6 interests (comma separated)'),

    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),

    type: z.enum(UserTypes).default('real'),
    register_type: z.enum(RegisterTypes).default('manual'),

    status: z.union([z.literal(''), z.number().int().min(0).max(3)]).default(''),
    is_active: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(''),
    is_verified: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(''),
    coins: z.union([z.literal(''), z.number().int().min(0)]).default(''),
    initial_coins: z.union([z.literal(''), z.number().int().min(0)]).default(''),

    avatar: z.any().optional().nullable(),

    //  media (selected before upload)
    media_images: z.array(z.any()).optional().default([]),
    media_videos: z.array(z.any()).optional().default([]),
  })
  .refine(
    (v) => {
      const hasEmail = !!String(v.email || '').trim();
      const hasPhone = !!String(v.phone || '').trim();
      return hasEmail || hasPhone;
    },
    { message: 'Provide email or phone', path: ['email'] }
  )
  .refine(
    (v) => {
      const s = String(v.height || '').trim();
      if (!s) return true;
      const n = heightStringToInt(s);
      return Number.isInteger(n) && n >= 50 && n <= 300;
    },
    { message: 'Height must be an integer between 50 and 300', path: ['height'] }
  )
  .refine(
    (v) => {
      const imgs = Array.isArray(v.media_images) ? v.media_images : [];
      const vids = Array.isArray(v.media_videos) ? v.media_videos : [];
      const okImgs = imgs.every(
        (f) => f instanceof File && String(f.type || '').startsWith('image/')
      );
      const okVids = vids.every(
        (f) => f instanceof File && String(f.type || '').startsWith('video/')
      );
      return okImgs && okVids;
    },
    { message: 'Invalid media file(s). Please select valid images/videos.', path: ['media_images'] }
  );

// -------------------------------
export default function AddUserView() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('general');

  // avatar preview
  const [avatarPreview, setAvatarPreview] = useState(null);

  // media previews
  const [imagePreviews, setImagePreviews] = useState([]); // [{file, url}]
  const [videoPreviews, setVideoPreviews] = useState([]); // [{file, url}]

  const getToken = () => {
    let t = getCookie('session_key');
    if (!t && typeof window !== 'undefined') t = window.localStorage.getItem('session_key') || '';
    return t || null;
  };

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      password: '',
      email: '',
      phone: '',

      full_name: '',
      gender: 'female',
      dob: null,

      bio: '',
      looking_for: 'Long Term',
      height: '',
      education: '',
      interests: '',

      city: '',
      state: '',
      country: '',
      address: '',

      type: 'real',
      register_type: 'manual',

      status: '',
      is_active: '',
      is_verified: '',
      coins: '',
      initial_coins: '',

      avatar: null,

      //  new
      media_images: [],
      media_videos: [],
    },
    mode: 'onBlur',
  });

  const avatarFile = watch('avatar');
  const mediaImages = watch('media_images');
  const mediaVideos = watch('media_videos');
  const country = watch('country');
  const state = watch('state');

  // avatar preview
  useEffect(() => {
    if (avatarFile instanceof File && avatarFile.type?.startsWith('image/')) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
    return undefined;
  }, [avatarFile]);

  // images previews
  const imgNamesKey = useMemo(
    () => JSON.stringify((Array.isArray(mediaImages) ? mediaImages : []).map((f) => f?.name || '')),
    [mediaImages]
  );
  useEffect(() => {
    imagePreviews.forEach((x) => {
      try {
        URL.revokeObjectURL(x.url);
      } catch (_) {}
    });

    const files = Array.isArray(mediaImages) ? mediaImages.filter((f) => f instanceof File) : [];
    const next = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setImagePreviews(next);

    return () => {
      next.forEach((x) => {
        try {
          URL.revokeObjectURL(x.url);
        } catch (_) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgNamesKey]);

  // videos previews
  const vidNamesKey = useMemo(
    () => JSON.stringify((Array.isArray(mediaVideos) ? mediaVideos : []).map((f) => f?.name || '')),
    [mediaVideos]
  );
  useEffect(() => {
    videoPreviews.forEach((x) => {
      try {
        URL.revokeObjectURL(x.url);
      } catch (_) {}
    });

    const files = Array.isArray(mediaVideos) ? mediaVideos.filter((f) => f instanceof File) : [];
    const next = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setVideoPreviews(next);

    return () => {
      next.forEach((x) => {
        try {
          URL.revokeObjectURL(x.url);
        } catch (_) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vidNamesKey]);

  // tab helpers
  const isTabError = (tabValue) => {
    const fields = ADD_TAB_FIELDS[tabValue];
    if (!fields) return false;
    return fields.some((field) => errors[field]);
  };

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  };

  const handleReset = () => {
    reset();
    setAvatarPreview(null);
    setCurrentTab('general');
  };

  const errorText = (path) => errors?.[path]?.message || '';

  const removeImageAt = (idx) => {
    const arr = Array.isArray(mediaImages) ? [...mediaImages] : [];
    arr.splice(idx, 1);
    setValue('media_images', arr, { shouldValidate: true, shouldDirty: true });
  };

  const removeVideoAt = (idx) => {
    const arr = Array.isArray(mediaVideos) ? [...mediaVideos] : [];
    arr.splice(idx, 1);
    setValue('media_videos', arr, { shouldValidate: true, shouldDirty: true });
  };

  //  upload media using your API: POST /users/:userId/media (field name: "media")
  const uploadMediaForUser = async ({ token, userId, files }) => {
    if (!files?.length) return { ok: true };

    const fd = new FormData();
    files.forEach((f) => fd.append('media', f)); // MUST match: fileUploader.array("media", 10)

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/users/${userId}/media`);

    const result = await axios.post(url, fd, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    const res = result?.data;
    if (!res?.success) {
      return {
        ok: false,
        message: res?.message || `Failed to upload media (HTTP ${result.status})`,
      };
    }

    return { ok: true };
  };

  const onSubmit = async (values) => {
    const token = getToken();

    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    if (!CONFIG?.apiUrl) {
      toast.error('CONFIG.apiUrl missing. Fix src/global-config');
      return;
    }

    try {
      setLoading(true);

      // 1) create user first
      const fd = new FormData();

      fd.append('password', String(values.password || ''));

      const email = String(values.email || '')
        .trim()
        .toLowerCase();
      const phone = String(values.phone || '').trim();
      if (!isBlank(email)) fd.append('email', email);
      if (!isBlank(phone)) fd.append('phone', phone);

      appendIfSet(fd, 'type', values.type);
      appendIfSet(fd, 'register_type', values.register_type);

      appendIfSet(fd, 'full_name', values.full_name);
      if (!isBlank(values.gender)) fd.append('gender', values.gender);

      if (values.dob && dayjs(values.dob).isValid()) {
        fd.append('dob', dayjs(values.dob).format('YYYY-MM-DD'));
      }

      appendIfSet(fd, 'bio', values.bio);
      if (!isBlank(values.looking_for)) fd.append('looking_for', values.looking_for);

      if (String(values.height || '').trim()) {
        fd.append('height', String(heightStringToInt(values.height)));
      }

      appendIfSet(fd, 'education', values.education);
      appendIfSet(fd, 'interests', values.interests);

      appendIfSet(fd, 'country', values.country);
      appendIfSet(fd, 'state', values.state);
      appendIfSet(fd, 'city', values.city);
      appendIfSet(fd, 'address', values.address);

      if (values.status !== '') fd.append('status', String(values.status));
      if (values.is_active !== '') fd.append('is_active', String(values.is_active));
      if (values.is_verified !== '') fd.append('is_verified', String(values.is_verified));
      if (values.coins !== '') fd.append('coins', String(values.coins));
      if (values.initial_coins !== '') fd.append('initial_coins', String(values.initial_coins));

      if (values.avatar instanceof File) fd.append('avatar', values.avatar);

      const createUrl = safeJoin(CONFIG.apiUrl, '/v1/admin/users/add');
      const createResult = await axios.post(createUrl, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const createRes = createResult?.data;

      if (createResult.status === 401 || createResult.status === 403) {
        toast.error(createRes?.message || createRes?.msg || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!createRes?.success) {
        toast.error(
          createRes?.message ||
            createRes?.msg ||
            `Failed to create user (HTTP ${createResult.status})`
        );
        return;
      }

      //  userId extraction (adjust if your API returns different)
      const newUserId =
        createRes?.data?.id ||
        createRes?.data?.user?.id ||
        createRes?.data?.user_id ||
        createRes?.data?.created?.id;

      if (!newUserId) {
        toast.error(
          'User created but userId not returned from API. Please return id in /users/add response.'
        );
        return;
      }

      // 2) upload media (images + videos) using your /users/:userId/media
      const imgFiles = (values.media_images || []).filter((f) => f instanceof File);
      const vidFiles = (values.media_videos || []).filter((f) => f instanceof File);
      const allMedia = [...imgFiles, ...vidFiles];

      if (allMedia.length) toast.info('User created. Uploading media...');

      if (allMedia.length) {
        const up = await uploadMediaForUser({ token, userId: newUserId, files: allMedia });
        if (!up.ok) {
          toast.error(up.message || 'Media upload failed.');
          return;
        }
      }

      toast.success(createRes?.message || 'User created successfully.');
      handleReset();
      router.push(`${paths.dashboard.users.root}?r=${Date.now()}`);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while creating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Add User"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Users', href: paths.dashboard.users.root },
          { name: 'Add' },
        ]}
        sx={{ mb: 3 }}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>There are errors in the form</AlertTitle>
              <Typography variant="body2">Please check the highlighted fields.</Typography>
              <Box component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
                {Object.keys(errors).map((key) => (
                  <li key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {errors[key]?.message}
                  </li>
                ))}
              </Box>
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  mb: 2,
                  '& .MuiTab-root': { minHeight: 48, minWidth: 120 },
                }}
                TabIndicatorProps={{ sx: { backgroundColor: 'primary.main' } }}
              >
                {ADD_TABS.map((tab) => {
                  const hasError = isTabError(tab.value);
                  return (
                    <Tab
                      key={tab.value}
                      value={tab.value}
                      label={tab.label}
                      icon={<Iconify icon={tab.icon} width={20} />}
                      iconPosition="start"
                      sx={{
                        color: hasError ? 'error.main' : 'inherit',
                        '&.Mui-selected': { color: hasError ? 'error.main' : 'primary.main' },
                      }}
                    />
                  );
                })}
              </Tabs>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ minHeight: 420 }}>
                {/* ---------------- GENERAL ---------------- */}
                {currentTab === 'general' && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 3, height: '100%' }}>
                        <Stack spacing={2} alignItems="center">
                          <Typography variant="h6">Avatar</Typography>

                          <Box
                            sx={{
                              width: 140,
                              height: 140,
                              borderRadius: '50%',
                              border: '1px dashed',
                              borderColor: 'divider',
                              p: 1,
                              position: 'relative',
                            }}
                          >
                            <Avatar
                              src={avatarPreview ?? undefined}
                              sx={{ width: '100%', height: '100%' }}
                            />
                            <Box sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                              <Controller
                                name="avatar"
                                control={control}
                                render={({ field }) => (
                                  <IconButton
                                    component="label"
                                    color="primary"
                                    disabled={loading}
                                    sx={{
                                      bgcolor: 'background.paper',
                                      boxShadow: 2,
                                      '&:hover': { bgcolor: 'background.neutral' },
                                    }}
                                  >
                                    <Iconify icon="mdi:camera" />
                                    <input
                                      hidden
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
                                    />
                                  </IconButton>
                                )}
                              />
                            </Box>
                          </Box>

                          {avatarFile && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setValue('avatar', null)}
                              disabled={loading}
                            >
                              Remove Picture
                            </Button>
                          )}

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: 'center' }}
                          >
                            Tips: Use PNG/JPG/WEBP. Square image works best.
                          </Typography>
                        </Stack>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Identity
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="full_name"
                              control={control}
                              render={({ field }) => (
                                <TextField {...field} label="Full Name" fullWidth />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="password"
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label="Password *"
                                  type="password"
                                  fullWidth
                                  error={!!errors.password}
                                  helperText={errorText('password')}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="email"
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label="Email"
                                  type="email"
                                  fullWidth
                                  error={!!errors.email}
                                  helperText={errorText('email')}
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="phone"
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label="Phone"
                                  fullWidth
                                  error={!!errors.phone}
                                  helperText={errorText('phone')}
                                />
                              )}
                            />
                          </Grid>

                          {(errors?.email?.message || errors?.phone?.message) && (
                            <Grid item xs={12}>
                              <FormHelperText error>
                                {errors?.email?.message || errors?.phone?.message}
                              </FormHelperText>
                            </Grid>
                          )}

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Register Type</InputLabel>
                              <Controller
                                name="register_type"
                                control={control}
                                render={({ field }) => (
                                  <Select {...field} label="Register Type" disabled={loading}>
                                    <MenuItem value="manual">Manual</MenuItem>
                                    <MenuItem value="gmail">Gmail</MenuItem>
                                  </Select>
                                )}
                              />
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>User Type</InputLabel>
                              <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                  <Select {...field} label="User Type" disabled={loading}>
                                    <MenuItem value="real">Real</MenuItem>
                                    <MenuItem value="bot">Bot</MenuItem>
                                  </Select>
                                )}
                              />
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {/* ---------------- PROFILE ---------------- */}
                {currentTab === 'profile' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Profile Details
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.gender}>
                          <InputLabel>Gender</InputLabel>
                          <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Gender" disabled={loading}>
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                              </Select>
                            )}
                          />
                          {errors.gender && <FormHelperText>{errorText('gender')}</FormHelperText>}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="dob"
                          control={control}
                          render={({ field }) => (
                            <DatePicker
                              label="DOB"
                              value={field.value}
                              onChange={field.onChange}
                              disabled={loading}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  error: !!errors.dob,
                                  helperText: errorText('dob'),
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.looking_for}>
                          <InputLabel>Looking For</InputLabel>
                          <Controller
                            name="looking_for"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Looking For" disabled={loading}>
                                {LOOKING_FOR.map((x) => (
                                  <MenuItem key={x} value={x}>
                                    {x}
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          />
                          {errors.looking_for && (
                            <FormHelperText>{errorText('looking_for')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="height"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Height "
                              fullWidth
                              error={!!errors.height}
                              helperText={errorText('height')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="education"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Education"
                              fullWidth
                              error={!!errors.education}
                              helperText={errorText('education')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="bio"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Bio"
                              fullWidth
                              multiline
                              minRows={3}
                              error={!!errors.bio}
                              helperText={errorText('bio')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="interests"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Interests (max 6, comma separated)"
                              fullWidth
                              error={!!errors.interests}
                              helperText={
                                errorText('interests') || 'Example: Music, Travel, Gym, Movies'
                              }
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* ---------------- LOCATION ---------------- */}
                {currentTab === 'location' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Location
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="country"
                          control={control}
                          render={({ field }) => (
                            <>
                              <CountrySelector
                                label="Country"
                                placeholder="Select country…"
                                multiple={false}
                                valueCode={field.value || ''}
                                onChangeCode={(code) => {
                                  field.onChange(code);
                                  setValue('state', '', {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                  setValue('city', '', { shouldDirty: true, shouldValidate: true });
                                }}
                                disabled={loading}
                                fullWidth
                              />
                              {!!errors.country && (
                                <FormHelperText error>{errorText('country')}</FormHelperText>
                              )}
                            </>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="state"
                          control={control}
                          render={({ field }) => (
                            <StateSelector
                              countryCode={country || ''}
                              value={field.value || ''}
                              onSelect={(val) => {
                                field.onChange(val);
                                setValue('city', '', { shouldDirty: true, shouldValidate: true });
                              }}
                              label="State"
                              placeholder="Select state..."
                              disabled={loading || !country}
                              error={errorText('state')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="city"
                          control={control}
                          render={({ field }) => (
                            <CitySelector
                              countryCode={country || ''}
                              stateCode={state || ''}
                              value={field.value || ''}
                              onSelect={(val) => field.onChange(val)}
                              label="City"
                              placeholder="Select city..."
                              disabled={loading || !country || !state}
                              error={errorText('city')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="address"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Address" fullWidth multiline minRows={2} />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* ---------------- IMAGES ---------------- */}
                {currentTab === 'images' && (
                  <Card sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="mdi:image" width={22} />
                        <Typography variant="h6">Images</Typography>
                      </Stack>

                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1">Upload Images</Typography>

                        <Controller
                          name="media_images"
                          control={control}
                          render={({ field }) => (
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<Iconify icon="mdi:upload" />}
                              disabled={loading}
                            >
                              Choose Images
                              <input
                                hidden
                                multiple
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []).filter((f) =>
                                    String(f.type || '').startsWith('image/')
                                  );
                                  field.onChange(files);
                                }}
                              />
                            </Button>
                          )}
                        />

                        {!!errors.media_images && (
                          <FormHelperText error>{errorText('media_images')}</FormHelperText>
                        )}

                        {imagePreviews?.length > 0 ? (
                          <Grid container spacing={1}>
                            {imagePreviews.map((x, idx) => (
                              <Grid item xs={6} sm={4} md={3} key={`${x.file.name}-${idx}`}>
                                <Box
                                  sx={{
                                    position: 'relative',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    height: 110,
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={x.url}
                                    alt="img"
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeImageAt(idx)}
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      bgcolor: 'background.paper',
                                      '&:hover': { bgcolor: 'background.paper' },
                                    }}
                                  >
                                    <Iconify icon="mdi:close" />
                                  </IconButton>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No images selected.
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Card>
                )}

                {/* ---------------- STATUS ---------------- */}
                {currentTab === 'status' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Status & Admin Fields
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.status}>
                          <InputLabel>Status</InputLabel>
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Status" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                {STATUS_OPTIONS.map((x) => (
                                  <MenuItem key={x.value} value={x.value}>
                                    {x.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          />
                          {!!errors.status && (
                            <FormHelperText>{errorText('status')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Is Active</InputLabel>
                          <Controller
                            name="is_active"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Is Active" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value={1}>Yes</MenuItem>
                                <MenuItem value={0}>No</MenuItem>
                              </Select>
                            )}
                          />
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Is Verified</InputLabel>
                          <Controller
                            name="is_verified"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Is Verified" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value={1}>Yes</MenuItem>
                                <MenuItem value={0}>No</MenuItem>
                              </Select>
                            )}
                          />
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="initial_coins"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Initial Coins" type="number" fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>
                    </Grid>
                  </Card>
                )}
              </Box>
            </Grid>

            {/* ---------------- ACTIONS ---------------- */}
            <Grid item xs={12}>
              <Card
                sx={{
                  p: 2,
                  position: 'sticky',
                  bottom: 16,
                  zIndex: 99,
                  bgcolor: 'background.paper',
                  boxShadow: (theme) => theme.shadows[20],
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Button
                    variant="soft"
                    color="inherit"
                    onClick={() => router.push(paths.dashboard.users.root)}
                    startIcon={<Iconify icon="mdi:arrow-left" />}
                    disabled={loading}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Cancel
                  </Button>

                  <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleReset}
                      startIcon={<Iconify icon="mdi:refresh" />}
                      disabled={loading}
                      fullWidth
                    >
                      Reset
                    </Button>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={<Iconify icon="mdi:content-save" />}
                      fullWidth
                    >
                      {loading ? 'Creating...' : 'Create User'}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </form>
      </LocalizationProvider>
    </DashboardContent>
  );
}
