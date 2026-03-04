'use client';

import { z } from 'zod';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';

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

import { paths } from 'src/routes/paths';

import { safeJoin } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import CitySelector from 'src/components/selectors/city-selector';
import StateSelector from 'src/components/selectors/state-selector';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CountrySelector from 'src/components/selectors/country-selector';
import { TABS, LookingFor, TAB_FIELDS, STATUS_OPTIONS } from 'src/components/chip/bot/bot-chips';

// ----------------------- schema -----------------------
const Schema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, 'Username min 3 chars')
      .max(50, 'Max 50 chars')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dot, underscore, hyphen'),

    email: z.string().trim().email('Valid email required').optional().or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{7,15}$/, 'Phone must be 7-15 digits (optional +)')
      .optional()
      .or(z.literal('')),

    password: z
      .string()
      .min(8, 'Min 8 chars')
      .max(255, 'Max 255 chars')
      .regex(/[A-Z]/, 'Must include 1 uppercase letter')
      .regex(/[a-z]/, 'Must include 1 lowercase letter')
      .regex(/[0-9]/, 'Must include 1 number'),

    register_type: z.enum(['manual', 'gmail']).default('manual'),
    type: z.enum(['bot', 'real']).default('bot'),

    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),

    dob: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((v) => {
        if (!v) return true;
        return dayjs(v, 'YYYY-MM-DD', true).isValid();
      }, 'DOB must be YYYY-MM-DD'),

    bio: z.string().trim().optional().or(z.literal('')),

    interests: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((v) => {
        if (!String(v || '').trim()) return true;
        const items = String(v)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        return items.length <= 6;
      }, 'Max 6 interests (comma separated)'),

    looking_for: z.enum(LookingFor).optional().or(z.literal('')),

    height: z
      .union([z.number(), z.string().trim()])
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => {
          if (v === '' || v === undefined || v === null) return true;
          const n = Number(v);
          return Number.isFinite(n) && n >= 50 && n <= 300 && Number.isInteger(n);
        },
        { message: 'Height must be an integer between 50 and 300' }
      ),

    education: z.string().trim().max(200).optional().or(z.literal('')),

    country: z.string().trim().max(100).optional().or(z.literal('')),
    state: z.string().trim().max(100).optional().or(z.literal('')),
    city: z.string().trim().max(100).optional().or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),
    ip_address: z.string().trim().max(45).optional().or(z.literal('')),

    status: z.union([z.literal(''), z.number().int().min(0).max(3)]).default(1),
    is_active: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(1),
    is_verified: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(0),

    avatar: z.any().optional().nullable(),

    //  NEW: media files stored before upload
    media_images: z.array(z.any()).optional().default([]),
    media_videos: z.array(z.any()).optional().default([]),
  })
  .refine(
    (data) => {
      const email = String(data.email || '').trim();
      const phone = String(data.phone || '').trim();
      return !!email || !!phone;
    },
    { message: 'Either email or phone is required.', path: ['email'] }
  )
  .refine(
    (data) => {
      const imgs = Array.isArray(data.media_images) ? data.media_images : [];
      const vids = Array.isArray(data.media_videos) ? data.media_videos : [];
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

// ---------------- component ----------------
export default function AddBotView() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('general');

  // avatar preview
  const [avatarPreview, setAvatarPreview] = useState(null);

  //  media previews
  const [imagePreviews, setImagePreviews] = useState([]); // [{file, url}]
  const [videoPreviews, setVideoPreviews] = useState([]); // [{file, url}]

  const getToken = () => {
    let token = getCookie('session_key');
    if (!token && typeof window !== 'undefined') token = window.localStorage.getItem('session_key');
    return token || null;
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
      email: '',
      phone: '',
      password: '',
      register_type: 'manual',
      type: 'bot',

      full_name: '',
      gender: 'female',
      dob: '',
      bio: '',
      interests: '',
      looking_for: 'Long Term',
      height: '',
      education: '',

      country: '',
      state: '',
      city: '',
      address: '',
      ip_address: '',

      //  NEW
      media_images: [],
      media_videos: [],

      status: 1,
      is_active: 1,
      is_verified: 0,

      avatar: null,
    },
    mode: 'onBlur',
  });

  const avatarFile = watch('avatar');
  const mediaImages = watch('media_images');
  const mediaVideos = watch('media_videos');

  useEffect(() => {
    if (avatarFile instanceof File && avatarFile.type?.startsWith('image/')) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
    return undefined;
  }, [avatarFile]);

  //  build image previews
  useEffect(() => {
    // cleanup old
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
  }, [JSON.stringify((mediaImages || []).map((f) => f?.name))]);

  //  build video previews
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
  }, [JSON.stringify((mediaVideos || []).map((f) => f?.name))]);

  const isTabError = (tabValue) => {
    const fields = TAB_FIELDS[tabValue];
    if (!fields) return false;
    return fields.some((field) => errors[field]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  };

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleReset = () => {
    reset();
    setAvatarPreview(null);
    setCurrentTab('general');
  };

  const errorText = (path) => errors?.[path]?.message || '';

  //  helper: upload images after bot created
  const uploadImagesForBot = async ({ token, botId, files }) => {
    if (!files?.length) return { ok: true };

    const fd = new FormData();
    files.forEach((f) => fd.append('media', f)); //  must match: fileUploader.array("media", 10)

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/media`);

    const result = await axios.post(url, fd, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    const res = result?.data;
    if (!res?.success) {
      return {
        ok: false,
        message: res?.message || `Failed to upload images (HTTP ${result.status})`,
      };
    }
    return { ok: true };
  };

  //  helper: upload videos after bot created
  const uploadVideosForBot = async ({ token, botId, files }) => {
    if (!files?.length) return { ok: true };

    const fd = new FormData();
    files.forEach((f) => fd.append('files', f)); //  must match: fileUploader.array("files", 10)

    const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/video`);

    const result = await axios.post(url, fd, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    const res = result?.data;
    if (!res?.success) {
      return {
        ok: false,
        message: res?.message || `Failed to upload videos (HTTP ${result.status})`,
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

      // 1)  Create bot first
      const fd = new FormData();

      fd.append('password', values.password);

      if (values.email != null && String(values.email).trim() !== '')
        fd.append('email', String(values.email).trim().toLowerCase());

      if (values.phone != null && String(values.phone).trim() !== '')
        fd.append('phone', String(values.phone).trim());

      if (values.gender != null && String(values.gender).trim() !== '')
        fd.append('gender', String(values.gender));

      if (values.dob != null && String(values.dob).trim() !== '')
        fd.append('dob', String(values.dob).trim());

      if (values.looking_for != null && String(values.looking_for).trim() !== '')
        fd.append('looking_for', String(values.looking_for));

      if (values.height != null && String(values.height).trim() !== '')
        fd.append('height', String(Number(values.height)));

      if (values.register_type != null && String(values.register_type).trim() !== '')
        fd.append('register_type', String(values.register_type));

      if (values.type != null && String(values.type).trim() !== '')
        fd.append('type', String(values.type));

      if (values.full_name != null && String(values.full_name).trim() !== '')
        fd.append('full_name', String(values.full_name).trim());

      if (values.bio != null && String(values.bio).trim() !== '')
        fd.append('bio', String(values.bio).trim());

      if (values.interests != null && String(values.interests).trim() !== '')
        fd.append('interests', String(values.interests).trim());

      if (values.education != null && String(values.education).trim() !== '')
        fd.append('education', String(values.education).trim());

      if (values.country != null && String(values.country).trim() !== '')
        fd.append('country', String(values.country).trim());

      if (values.state != null && String(values.state).trim() !== '')
        fd.append('state', String(values.state).trim());

      if (values.city != null && String(values.city).trim() !== '')
        fd.append('city', String(values.city).trim());

      if (values.address != null && String(values.address).trim() !== '')
        fd.append('address', String(values.address).trim());

      if (values.ip_address != null && String(values.ip_address).trim() !== '')
        fd.append('ip_address', String(values.ip_address).trim());

      if (values.status !== '') fd.append('status', String(values.status));
      if (values.is_active !== '') fd.append('is_active', String(values.is_active));
      if (values.is_verified !== '') fd.append('is_verified', String(values.is_verified));

      if (values.avatar instanceof File) fd.append('avatar', values.avatar);

      const createUrl = safeJoin(CONFIG.apiUrl, '/v1/admin/bots/add');

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
            `Failed to create bot (HTTP ${createResult.status})`
        );
        return;
      }

      //  IMPORTANT: botId extraction (adjust this based on your API response)
      const newBotId =
        createRes?.data?.id ||
        createRes?.data?.user?.id ||
        createRes?.data?.bot?.id ||
        createRes?.data?.user_id;

      if (!newBotId) {
        toast.error(
          'Bot created but botId not returned from API. Please return id in /bots/add response.'
        );
        return;
      }

      // 2)  Upload images/videos automatically (still part of "create" flow)
      const imgFiles = (values.media_images || []).filter((f) => f instanceof File);
      const vidFiles = (values.media_videos || []).filter((f) => f instanceof File);

      if (imgFiles.length || vidFiles.length) {
        toast.info('Bot created. Uploading media...');
      }

      if (imgFiles.length) {
        const up1 = await uploadImagesForBot({ token, botId: newBotId, files: imgFiles });
        if (!up1.ok) {
          toast.error(up1.message || 'Images upload failed.');
          return;
        }
      }

      if (vidFiles.length) {
        const up2 = await uploadVideosForBot({ token, botId: newBotId, files: vidFiles });
        if (!up2.ok) {
          toast.error(up2.message || 'Videos upload failed.');
          return;
        }
      }

      toast.success(createRes?.message || 'Bot user created successfully.');
      handleReset();
      router.push(paths.dashboard.bots?.root || '#');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while creating bot');
    } finally {
      setLoading(false);
    }
  };

  const removeImageAt = (idx) => {
    const arr = Array.isArray(mediaImages) ? [...mediaImages] : [];
    arr.splice(idx, 1);
    setValue('media_images', arr, { shouldValidate: true });
  };

  const removeVideoAt = (idx) => {
    const arr = Array.isArray(mediaVideos) ? [...mediaVideos] : [];
    arr.splice(idx, 1);
    setValue('media_videos', arr, { shouldValidate: true });
  };

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Add Bot"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bots', href: paths.dashboard.bots?.root || '#' },
          { name: 'Add' },
        ]}
        sx={{ mb: 3 }}
      />

      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>There are errors in the form</AlertTitle>
            <Typography variant="body2">Please check the following fields:</Typography>
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
              sx={{ mb: 2, '& .MuiTab-root': { minHeight: 48, minWidth: 120 } }}
              TabIndicatorProps={{ sx: { backgroundColor: 'primary.main' } }}
            >
              {TABS.map((tab) => {
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
                                <Select {...field} label="Register Type">
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
                                <Select {...field} label="User Type">
                                  <MenuItem value="bot">Bot</MenuItem>
                                  <MenuItem value="real">Real</MenuItem>
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
                            <Select {...field} label="Gender">
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
                          <TextField
                            {...field}
                            label="DOB (YYYY-MM-DD)"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            error={!!errors.dob}
                            helperText={errorText('dob')}
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
                            <Select {...field} label="Looking For">
                              {LookingFor.map((x) => (
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
                          <CountrySelector
                            label="Country"
                            placeholder="Select country…"
                            multiple={false}
                            valueCode={field.value || ''}
                            onChangeCode={(code) => {
                              field.onChange(code);
                              setValue('state', '');
                              setValue('city', '');
                            }}
                            disabled={loading}
                            fullWidth
                          />
                        )}
                      />
                      {!!errors.country && (
                        <FormHelperText error>{errorText('country')}</FormHelperText>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="state"
                        control={control}
                        render={({ field }) => (
                          <StateSelector
                            countryCode={watch('country') || ''}
                            value={field.value || ''}
                            onSelect={(val) => {
                              field.onChange(val);
                              setValue('city', '');
                            }}
                            label="State"
                            placeholder="Select state..."
                            disabled={loading}
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
                            countryCode={watch('country') || ''}
                            stateCode={watch('state') || ''}
                            value={field.value || ''}
                            onSelect={(val) => field.onChange(val)}
                            label="City"
                            placeholder="Select city..."
                            disabled={loading}
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

              {/* ---------------- IMAGES TAB ---------------- */}
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

              {/* ---------------- VIDEOS TAB ---------------- */}
              {currentTab === 'videos' && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="mdi:video" width={22} />
                      <Typography variant="h6">Videos</Typography>
                    </Stack>

                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1">Upload Videos</Typography>

                      <Controller
                        name="media_videos"
                        control={control}
                        render={({ field }) => (
                          <Button
                            component="label"
                            variant="outlined"
                            startIcon={<Iconify icon="mdi:video" />}
                            disabled={loading}
                          >
                            Choose Videos
                            <input
                              hidden
                              multiple
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []).filter((f) =>
                                  String(f.type || '').startsWith('video/')
                                );
                                field.onChange(files);
                              }}
                            />
                          </Button>
                        )}
                      />

                      {!!errors.media_videos && (
                        <FormHelperText error>{errorText('media_videos')}</FormHelperText>
                      )}

                      {videoPreviews?.length > 0 ? (
                        <Stack spacing={1.5}>
                          {videoPreviews.map((x, idx) => (
                            <Box
                              key={`${x.file.name}-${idx}`}
                              sx={{
                                position: 'relative',
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                                p: 1,
                              }}
                            >
                              <video
                                src={x.url}
                                controls
                                style={{ width: '100%', borderRadius: 8 }}
                              />
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mt: 1 }}
                              >
                                <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                                  {x.file.name}
                                </Typography>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeVideoAt(idx)}
                                >
                                  <Iconify icon="mdi:close" />
                                </IconButton>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No videos selected.
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
                    Status
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Status">
                              {STATUS_OPTIONS.map((x) => (
                                <MenuItem key={x.value} value={x.value}>
                                  {x.label}
                                </MenuItem>
                              ))}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Is Active</InputLabel>
                        <Controller
                          name="is_active"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Is Active">
                              <MenuItem value={1}>Yes</MenuItem>
                              <MenuItem value={0}>No</MenuItem>
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Is Verified</InputLabel>
                        <Controller
                          name="is_verified"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Is Verified">
                              <MenuItem value={1}>Yes</MenuItem>
                              <MenuItem value={0}>No</MenuItem>
                            </Select>
                          )}
                        />
                      </FormControl>
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
                  onClick={() => router.push(paths.dashboard.bots?.root || paths.dashboard.root)}
                  startIcon={<Iconify icon="mdi:arrow-left" />}
                  disabled={loading}
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
                    {loading ? 'Creating...' : 'Create Bot'}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </form>
    </DashboardContent>
  );
}
