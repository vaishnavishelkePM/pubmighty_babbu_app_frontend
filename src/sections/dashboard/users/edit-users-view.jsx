'use client';

import { z } from 'zod';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useParams } from 'next/navigation';
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
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AlertTitle from '@mui/material/AlertTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { safeTrim, safeJoin, getSessionToken } from 'src/utils/helper';
import { isFileLike,  publicUrlFromPath } from 'src/utils/user-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import LoadingPopup from 'src/components/popup/loading-popup';
import CitySelector from 'src/components/selectors/city-selector';
import StateSelector from 'src/components/selectors/state-selector';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CountrySelector from 'src/components/selectors/country-selector';
import {
  TABS,
  STATUS,
  GENDERS,
  TAB_FIELDS,
  LOOKING_FOR,
} from 'src/components/chip/user/user-status';

// ----------------------- schema -----------------------
const Schema = z.object({
  email: z
    .union([z.literal(''), z.string().trim().email('Valid email required')])
    .optional()
    .nullable(),
  phone: z.string().trim().max(100).optional().nullable(),
  full_name: z.string().trim().max(300).optional().nullable(),
  password: z.string().trim().max(255).optional().nullable(),
  coins: z
    .union([z.literal(''), z.string().trim(), z.number()])
    .optional()
    .transform((v) => {
      const s = String(v ?? '').trim();
      if (!s) return '';
      const n = Number(s);
      return Number.isFinite(n) ? Math.trunc(n) : '';
    })
    .refine((v) => v === '' || (Number.isInteger(v) && v >= 0), 'Coins must be 0 or more'),
  gender: z
    .union([z.literal(''), z.enum(GENDERS)])
    .optional()
    .nullable(),
  dob: z
    .union([z.literal(''), z.string().trim()])
    .optional()
    .nullable()
    .refine((v) => {
      if (!v) return true;
      return dayjs(v).isValid();
    }, 'Invalid date'),
  looking_for: z
    .union([z.literal(''), z.enum(LOOKING_FOR)])
    .optional()
    .nullable(),
  height: z.string().trim().max(10).optional().nullable(),
  education: z.string().trim().max(200).optional().nullable(),
  bio: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),

  country: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),

  status: z.union([z.literal(''), z.number().int().min(0).max(3)]).default(''),
  is_active: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(''),
  is_verified: z.union([z.literal(''), z.number().int().min(0).max(1)]).default(''),

  avatar: z.any().optional().nullable(),
});

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();

  const userId = Number(params?.id);

  const [loading, setLoading] = useState(false);
  const [actionText, setActionText] = useState('Working...');
  const [fetching, setFetching] = useState(false);
  const [currentTab, setCurrentTab] = useState('identity');

  const [user, setUser] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // MEDIA STATE (same style as EditBotView)
  const [mediaLoading, setMediaLoading] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);

  // IMAGE VIEWER (dialog)
  const [openImageViewer, setOpenImageViewer] = useState(false);
  const [viewerSrc, setViewerSrc] = useState('');

  const handleOpenImageViewer = (src) => {
    const s = String(src || '').trim();
    if (!s) return;
    setViewerSrc(s);
    setOpenImageViewer(true);
  };

  const handleCloseImageViewer = () => {
    setOpenImageViewer(false);
    setViewerSrc('');
  };

  // ----------------------- fetch user -----------------------
  const fetchUser = useCallback(async () => {
    if (!userId) return;

    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    try {
      setFetching(true);
      const url = safeJoin(CONFIG.apiUrl, `v1/admin/users/${userId}`);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || res?.data?.msg || 'Failed to fetch user');
        return;
      }

      const u = res?.data?.data?.user || res?.data?.data || null;
      setUser(u);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while fetching user');
    } finally {
      setFetching(false);
    }
  }, [router, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ----------------------- defaults -----------------------
  const defaults = useMemo(
    () => ({
      email: user?.email || '',
      phone: user?.phone || '',
      full_name: user?.full_name || '',
      password: '',

      gender: user?.gender || '',
      dob: user?.dob ? String(user?.dob).slice(0, 10) : '',
      looking_for: user?.looking_for || '',
      height: user?.height ?? '',
      education: user?.education || '',
      bio: user?.bio || '',
      interests: user?.interests || '',
      coins: Number.isFinite(user?.coins) ? Number(user?.coins) : '',
      country: user?.country || '',
      state: user?.state || '',
      city: user?.city || '',
      address: user?.address || '',

      status: Number.isFinite(user?.status) ? Number(user?.status) : '',
      is_active:
        user?.is_active === true || user?.is_active === 1 || user?.is_active === '1'
          ? 1
          : user?.is_active === false || user?.is_active === 0 || user?.is_active === '0'
            ? 0
            : '',
      is_verified:
        user?.is_verified === true || user?.is_verified === 1 || user?.is_verified === '1'
          ? 1
          : user?.is_verified === false || user?.is_verified === 0 || user?.is_verified === '0'
            ? 0
            : '',

      avatar: null,
    }),
    [user]
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!user) return;
    reset(defaults);
    setAvatarPreview(null);
    setCurrentTab('identity');

    // reset media picks
    setNewImages([]);
    setNewVideos([]);
    setImagePreviews([]);
    setVideoPreviews([]);
  }, [user, defaults, reset]);

  // ----------------------- avatar preview -----------------------
  const avatarFile = watch('avatar');

  useEffect(() => {
    if (isFileLike(avatarFile) && String(avatarFile?.type || '').startsWith('image/')) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
    return undefined;
  }, [avatarFile]);

  const avatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    const a = String(user?.avatar || '').trim();
    if (!a) return '';
    if (a.startsWith('http')) return a;
    if (a.startsWith('/uploads/') || a.startsWith('uploads/')) return publicUrlFromPath(a);
    return publicUrlFromPath(`uploads/avatar/user/${a}`);
  };

  const errorText = (path) => errors?.[path]?.message || '';

  const isTabError = (tabValue) => {
    const fields = TAB_FIELDS[tabValue];
    if (!fields) return false;
    return fields.some((f) => !!errors?.[f]);
  };

  // ----------------------- MEDIA: fetch existing -----------------------
  const fetchMedia = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    if (!userId || !Number.isFinite(userId)) return;

    try {
      setMediaLoading(true);

      // Your routes:
      // GET /users/:userId/media  (under admin)
      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/users/${userId}/media`);

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to fetch media');
        setExistingImages([]);
        setExistingVideos([]);
        return;
      }

      // backend returns: data.images (contains both image+video in your function)
      const list = res?.data?.data?.images || res?.data?.data?.media || [];
      const arr = Array.isArray(list) ? list : [];

      const imgs = arr.filter((m) => String(m?.mime_type || '').startsWith('image/'));
      const vids = arr.filter((m) => String(m?.mime_type || '').startsWith('video/'));

      setExistingImages(imgs);
      setExistingVideos(vids);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch media');
      setExistingImages([]);
      setExistingVideos([]);
    } finally {
      setMediaLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    fetchMedia();
  }, [user, fetchMedia]);

  // ----------------------- MEDIA previews for new files -----------------------
  useEffect(() => {
    imagePreviews.forEach((x) => {
      try {
        URL.revokeObjectURL(x.url);
      } catch (_) {}
    });

    const next = (newImages || []).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setImagePreviews(next);

    return () => {
      next.forEach((x) => {
        try {
          URL.revokeObjectURL(x.url);
        } catch (_) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((newImages || []).map((f) => `${f?.name}-${f?.size}-${f?.lastModified}`))]);

  useEffect(() => {
    videoPreviews.forEach((x) => {
      try {
        URL.revokeObjectURL(x.url);
      } catch (_) {}
    });

    const next = (newVideos || []).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setVideoPreviews(next);

    return () => {
      next.forEach((x) => {
        try {
          URL.revokeObjectURL(x.url);
        } catch (_) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((newVideos || []).map((f) => `${f?.name}-${f?.size}-${f?.lastModified}`))]);

  const pickImages = (files) => {
    const arr = Array.from(files || []).filter((f) => String(f.type || '').startsWith('image/'));
    setNewImages((prev) => [...(prev || []), ...arr]);
  };

  const pickVideos = (files) => {
    const arr = Array.from(files || []).filter((f) => String(f.type || '').startsWith('video/'));
    setNewVideos((prev) => [...(prev || []), ...arr]);
  };

  const removeNewImageAt = (idx) => {
    setNewImages((prev) => {
      const arr = [...(prev || [])];
      arr.splice(idx, 1);
      return arr;
    });
  };

  const removeNewVideoAt = (idx) => {
    setNewVideos((prev) => {
      const arr = [...(prev || [])];
      arr.splice(idx, 1);
      return arr;
    });
  };

  // ----------------------- IMAGES+VIDEOS: upload (replace-all per backend) -----------------------
  const uploadMedia = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    const files = [...(newImages || []), ...(newVideos || [])];
    if (!files.length) {
      toast.info('Please select files first.');
      return;
    }

    try {
      setLoading(true);
      setActionText('Uploading media...');

      const fd = new FormData();
      files.forEach((f) => fd.append('media', f)); //  backend expects "media"

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/users/${userId}/media`);
      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to upload media');
        return;
      }

      toast.success(res?.data?.message || 'Media updated');
      setNewImages([]);
      setNewVideos([]);
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while uploading media');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  // ----------------------- delete existing media -----------------------
  const deleteExistingMedia = async (mediaId) => {
    const token = getSessionToken();
    if (!token) return;

    try {
      setLoading(true);
      setActionText('Deleting media...');

      const url = safeJoin(
        CONFIG.apiUrl,
        `/v1/admin/users/${userId}/media/${Number(mediaId)}/delete`
      );
      const res = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to delete media');
        return;
      }

      toast.success(res?.data?.message || 'Media deleted');
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while deleting media');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  // ----------------------- UPDATE USER -----------------------
  const buildFormDataDiff = (vals) => {
    const fd = new FormData();
    const initial = defaults;
    if (String(vals.coins) !== String(initial.coins)) {
      if (vals.coins !== '' && vals.coins !== null && vals.coins !== undefined) {
        fd.append('coins', String(Number(vals.coins)));
      }
    }
    const emailNow = String(vals?.email || '')
      .trim()
      .toLowerCase();
    const emailInit = String(initial?.email || '')
      .trim()
      .toLowerCase();

    if (emailNow !== emailInit) fd.append('email', emailNow);
    if (safeTrim(vals.phone) !== safeTrim(initial.phone)) fd.append('phone', safeTrim(vals.phone));
    if (safeTrim(vals.full_name) !== safeTrim(initial.full_name))
      fd.append('full_name', safeTrim(vals.full_name));
    if (safeTrim(vals.password)) fd.append('password', safeTrim(vals.password));

    if (safeTrim(vals.gender) !== safeTrim(initial.gender))
      fd.append('gender', safeTrim(vals.gender));
    if (safeTrim(vals.dob) !== safeTrim(initial.dob)) fd.append('dob', safeTrim(vals.dob));
    if (safeTrim(vals.looking_for) !== safeTrim(initial.looking_for))
      fd.append('looking_for', safeTrim(vals.looking_for));
    if (safeTrim(vals.height) !== safeTrim(initial.height))
      fd.append('height', safeTrim(vals.height));
    if (safeTrim(vals.education) !== safeTrim(initial.education))
      fd.append('education', safeTrim(vals.education));
    if (safeTrim(vals.bio) !== safeTrim(initial.bio)) fd.append('bio', safeTrim(vals.bio));
    if (safeTrim(vals.interests) !== safeTrim(initial.interests))
      fd.append('interests', safeTrim(vals.interests));

    if (safeTrim(vals.country) !== safeTrim(initial.country))
      fd.append('country', safeTrim(vals.country));
    if (safeTrim(vals.state) !== safeTrim(initial.state)) fd.append('state', safeTrim(vals.state));
    if (safeTrim(vals.city) !== safeTrim(initial.city)) fd.append('city', safeTrim(vals.city));
    if (safeTrim(vals.address) !== safeTrim(initial.address))
      fd.append('address', safeTrim(vals.address));

    if (String(vals.status) !== String(initial.status)) {
      if (vals.status !== '' && vals.status !== null && vals.status !== undefined) {
        fd.append('status', String(Number(vals.status)));
      }
    }

    // is_active ('' | 0 | 1)
    if (String(vals.is_active) !== String(initial.is_active)) {
      if (vals.is_active !== '' && vals.is_active !== null && vals.is_active !== undefined) {
        fd.append('is_active', vals.is_active === 1 ? 'true' : 'false');
      }
    }

    // is_verified ('' | 0 | 1)
    if (String(vals.is_verified) !== String(initial.is_verified)) {
      if (vals.is_verified !== '' && vals.is_verified !== null && vals.is_verified !== undefined) {
        fd.append('is_verified', vals.is_verified === 1 ? 'true' : 'false');
      }
    }

    if (isFileLike(vals.avatar)) fd.append('avatar', vals.avatar);

    return fd;
  };

  const onSubmit = async (values) => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    if (!userId) {
      toast.error('Missing user id');
      return;
    }

    try {
      setLoading(true);
      setActionText('Updating user...');

      const fd = buildFormDataDiff(values);
      if ([...fd.keys()].length === 0) {
        toast.info('Change at least one field.');
        return;
      }

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/users/${userId}`);
      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || res?.data?.msg || 'Failed to update user');
        return;
      }

      toast.success(res?.data?.message || 'User updated');
      router.push('/dashboard/users');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while updating user');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={`Edit User #${userId || ''}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Users', href: '/dashboard/users' },
          { name: `Edit #${userId || ''}` },
        ]}
        sx={{ mb: 3 }}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
        }}
      >
        {Object.keys(errors || {}).length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>There are errors in the form</AlertTitle>
            <Typography variant="body2">Please check the highlighted fields.</Typography>
          </Alert>
        )}

        {fetching ? (
          <Card sx={{ p: 3, borderRadius: 2.5 }}>
            <Typography>Loading user…</Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {/* ---------------- TABS ---------------- */}
            <Grid item xs={12}>
              <Tabs
                value={currentTab}
                onChange={(_, v) => setCurrentTab(v)}
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

            {/* ---------------- TAB CONTENT ---------------- */}
            <Grid item xs={12}>
              <Box sx={{ minHeight: 400 }}>
                {/* IDENTITY */}
                {currentTab === 'identity' && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 3, height: '100%' }}>
                        <Stack spacing={3} alignItems="center">
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
                            <Avatar src={avatarSrc()} sx={{ width: '100%', height: '100%' }} />
                            <Box sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                              <Controller
                                name="avatar"
                                control={control}
                                render={({ field }) => (
                                  <IconButton
                                    component="label"
                                    color="primary"
                                    sx={{
                                      bgcolor: 'background.paper',
                                      boxShadow: 2,
                                      '&:hover': { bgcolor: 'background.neutral' },
                                    }}
                                    disabled={loading}
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

                          {!!avatarFile && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setValue('avatar', null)}
                            >
                              Remove Avatar
                            </Button>
                          )}

                          <Typography variant="caption" color="text.secondary" align="center">
                            PNG/JPG/WEBP recommended. Square image works best.
                          </Typography>
                        </Stack>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                          Identity Information
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="full_name"
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label="Username"
                                  fullWidth
                                  error={!!errors.full_name}
                                  helperText={errorText('full_name')}
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
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="phone"
                              control={control}
                              render={({ field }) => (
                                <TextField {...field} label="Phone" fullWidth />
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
                                  label="New Password (optional)"
                                  type="password"
                                  fullWidth
                                  helperText="Leave empty to keep current password"
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {/* PROFILE */}
                {currentTab === 'profile' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                      Profile Details
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth error={!!errors.gender}>
                          <InputLabel>Gender</InputLabel>
                          <Controller
                            name="gender"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Gender" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                              </Select>
                            )}
                          />
                          {!!errors.gender && (
                            <FormHelperText>{errorText('gender')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="dob"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="DOB"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                              error={!!errors.dob}
                              helperText={errorText('dob')}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth error={!!errors.looking_for}>
                          <InputLabel>Looking For</InputLabel>
                          <Controller
                            name="looking_for"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Looking For" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                {LOOKING_FOR.map((x) => (
                                  <MenuItem key={x} value={x}>
                                    {x}
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          />
                          {!!errors.looking_for && (
                            <FormHelperText>{errorText('looking_for')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="height"
                          control={control}
                          render={({ field }) => <TextField {...field} label="Height" fullWidth />}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="education"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Education" fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="bio"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Bio" fullWidth multiline minRows={3} />
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
                              label="Interests"
                              fullWidth
                              multiline
                              minRows={2}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* LOCATION */}
                {currentTab === 'location' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                      Location Details
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
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="state"
                          control={control}
                          render={({ field }) => (
                            <StateSelector
                              label="State"
                              value={field.value || ''}
                              countryCode={watch('country') || ''}
                              onSelect={(code) => {
                                field.onChange(code);
                                setValue('city', '');
                              }}
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
                              label="City"
                              valueCode={field.value || ''}
                              countryCode={watch('country') || ''}
                              stateCode={watch('state') || ''}
                              onSelect={field.onChange}
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

                {/* IMAGES TAB */}
                {currentTab === 'images' && (
                  <Card sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="mdi:image" width={20} />
                        <Typography variant="h6">Images</Typography>

                        {(mediaLoading || loading) && (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ ml: 'auto' }}
                          >
                            <CircularProgress size={18} />
                            <Typography variant="caption" color="text.secondary">
                              Loading...
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          component="label"
                          variant="contained"
                          startIcon={<Iconify icon="mdi:upload" />}
                          disabled={loading}
                        >
                          Select Images
                          <input
                            hidden
                            multiple
                            type="file"
                            accept="image/*"
                            onChange={(e) => pickImages(e.target.files)}
                          />
                        </Button>

                        <Button
                          variant="contained"
                          color="success"
                          onClick={uploadMedia}
                          disabled={loading || (!newImages.length && !newVideos.length)}
                        >
                          Upload
                        </Button>
                      </Stack>

                      <Divider />

                      <Typography variant="subtitle2">
                        Already Uploaded ({existingImages.length})
                      </Typography>

                      {existingImages.length ? (
                        <Grid container spacing={1.5}>
                          {existingImages.map((row) => {
                            const p = String(
                              row?.media_path || row?.image_path || row?.video_path || ''
                            ).trim();

                            const src = p
                              ? p.startsWith('http')
                                ? p
                                : publicUrlFromPath(p)
                              : (() => {
                                  const folders = String(row?.folders || '').trim();
                                  const name = String(row?.name || '').trim();
                                  if (folders && name)
                                    return publicUrlFromPath(`/${folders}/${name}`);
                                  return '';
                                })();

                            return (
                              <Grid
                                item
                                xs={6}
                                sm={4}
                                md={3}
                                key={row.id ?? `${row.name}-${row.created_at}`}
                              >
                                <Box
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    height: 150,
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={src}
                                    alt=""
                                    onClick={() => handleOpenImageViewer(src)}
                                    sx={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      cursor: src ? 'pointer' : 'default',
                                      display: 'block',
                                    }}
                                  />

                                  <Tooltip title="Delete image">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        deleteExistingMedia(row.id);
                                      }}
                                      disabled={loading}
                                      sx={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'background.paper' },
                                      }}
                                    >
                                      <Iconify icon="mdi:delete" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No images uploaded yet.
                        </Typography>
                      )}

                      <Divider />

                      <Typography variant="subtitle2">
                        Selected (New) ({newImages.length})
                      </Typography>

                      {imagePreviews.length ? (
                        <Grid container spacing={1.5}>
                          {imagePreviews.map((x, idx) => (
                            <Grid item xs={6} sm={4} md={3} key={`${x.file.name}-${idx}`}>
                              <Box
                                sx={{
                                  border: '1px dashed',
                                  borderColor: 'divider',
                                  borderRadius: 1.5,
                                  overflow: 'hidden',
                                  position: 'relative',
                                  height: 150,
                                }}
                              >
                                <Box
                                  component="img"
                                  src={x.url}
                                  alt=""
                                  onClick={() => handleOpenImageViewer(x.url)}
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    display: 'block',
                                  }}
                                />

                                <Tooltip title="Remove selected">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeNewImageAt(idx);
                                    }}
                                    disabled={loading}
                                    sx={{
                                      position: 'absolute',
                                      top: 6,
                                      right: 6,
                                      bgcolor: 'background.paper',
                                      '&:hover': { bgcolor: 'background.paper' },
                                    }}
                                  >
                                    <Iconify icon="mdi:close" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No new images selected.
                        </Typography>
                      )}
                    </Stack>
                  </Card>
                )}

                {/* SECURITY TAB */}
                {currentTab === 'security' && (
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Security & Status
                    </Typography>

                    <Grid container spacing={2}>
                      {/* Status */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.status}>
                          <InputLabel>Status</InputLabel>
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Status" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value={0}>{STATUS[0]}</MenuItem>
                                <MenuItem value={1}>{STATUS[1]}</MenuItem>
                                <MenuItem value={2}>{STATUS[2]}</MenuItem>
                                <MenuItem value={3}>{STATUS[3]}</MenuItem>
                              </Select>
                            )}
                          />
                          {!!errors.status && (
                            <FormHelperText>{errorText('status')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      {/* Is Active */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.is_active}>
                          <InputLabel>Is Active</InputLabel>
                          <Controller
                            name="is_active"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Is Active" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value={1}>Active</MenuItem>
                                <MenuItem value={0}>Inactive</MenuItem>
                              </Select>
                            )}
                          />
                          {!!errors.is_active && (
                            <FormHelperText>{errorText('is_active')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>

                      {/* Is Verified */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.is_verified}>
                          <InputLabel>Is Verified</InputLabel>
                          <Controller
                            name="is_verified"
                            control={control}
                            render={({ field }) => (
                              <Select {...field} label="Is Verified" disabled={loading}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value={1}>Verified</MenuItem>
                                <MenuItem value={0}>Not Verified</MenuItem>
                              </Select>
                            )}
                          />
                          {!!errors.is_verified && (
                            <FormHelperText>{errorText('is_verified')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="coins"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Coins"
                              type="number"
                              fullWidth
                              disabled={loading}
                              error={!!errors.coins}
                              helperText={errorText('coins')}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>

                    <Divider sx={{ mt: 3 }} />
                  </Card>
                )}
              </Box>
            </Grid>

            {/* ---------------- ACTIONS (sticky like EditBotView) ---------------- */}
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
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    variant="soft"
                    color="inherit"
                    onClick={() => router.push('/dashboard/users')}
                  >
                    Cancel
                  </Button>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        reset(defaults);
                        setAvatarPreview(null);
                        setNewImages([]);
                        setNewVideos([]);
                        setImagePreviews([]);
                        setVideoPreviews([]);
                        setCurrentTab('identity');
                      }}
                      startIcon={<Iconify icon="mdi:refresh" />}
                      disabled={loading}
                    >
                      Reset
                    </Button>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={<Iconify icon="mdi:content-save" />}
                    >
                      {loading ? 'Updating...' : 'Update User'}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}
      </form>

      <LoadingPopup open={loading} message={actionText} />

      {/* IMAGE VIEWER DIALOG */}
      <Dialog open={openImageViewer} onClose={handleCloseImageViewer} maxWidth="md" fullWidth>
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
          }}
        >
          <IconButton
            onClick={handleCloseImageViewer}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
            }}
          >
            <Iconify icon="mdi:close" width={22} color="#fff" />
          </IconButton>

          {!!viewerSrc && (
            <Box
              component="img"
              src={viewerSrc}
              alt=""
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>
    </DashboardContent>
  );
}
