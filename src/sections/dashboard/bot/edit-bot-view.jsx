'use client';

import { z } from 'zod';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
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
import IconButton from '@mui/material/IconButton';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { safeJoin, getSessionToken } from 'src/utils/helper';
import {
  fileSize,
  isFileLike,
  getImageSrc,
  getVideoSrc,

  normalizeCSV6,
  publicUrlFromPath,
} from 'src/utils/user-helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import LoadingPopup from 'src/components/popup/loading-popup';
import { LookingFor } from 'src/components/chip/bot/bot-chips';
import CitySelector from 'src/components/selectors/city-selector';
import StateSelector from 'src/components/selectors/state-selector';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CountrySelector from 'src/components/selectors/country-selector';

const Schema = z.object({
  email: z
    .union([z.literal(''), z.string().trim().email('Valid email required').max(300)])
    .default(''),
  phone: z.string().trim().max(100).optional().nullable(),
  password: z.string().optional().nullable(),

  status: z.union([z.literal(''), z.number().int().min(0).max(3)]).default(''),
  is_active: z
    .preprocess(
      (v) => (v === '' || v === null || v === undefined ? '' : Number(v)),
      z.union([z.literal(''), z.number().int().min(0).max(1)])
    )
    .default(''),

  is_verified: z
    .preprocess(
      (v) => (v === '' || v === null || v === undefined ? '' : Number(v)),
      z.union([z.literal(''), z.number().int().min(0).max(1)])
    )
    .default(''),

  is_deleted: z
    .preprocess(
      (v) => (v === '' || v === null || v === undefined ? '' : Number(v)),
      z.union([z.literal(''), z.number().int().min(0).max(1)])
    )
    .default(''),

  full_name: z.string().trim().max(300).optional().nullable(),
  gender: z
    .union([z.literal(''), z.enum(['male', 'female', 'other', 'prefer_not_to_say'])])
    .default(''),
  dob: z.union([z.literal(''), z.string().trim().max(10)]).default(''),
  bio: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),
  looking_for: z.union([z.literal(''), z.enum(LookingFor)]).default(''),
  height: z.union([z.literal(''), z.string().trim().max(10)]).default(''),
  education: z.string().trim().max(200).optional().nullable(),

  country: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),

  avatar: z.any().optional().nullable(),
});

const TAB_FIELDS = {
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

const TABS = [
  { value: 'identity', label: 'Identity', icon: 'mdi:account' },
  { value: 'profile', label: 'Profile', icon: 'mdi:card-account-details' },
  { value: 'location', label: 'Location', icon: 'mdi:map-marker' },
  { value: 'images', label: 'Images', icon: 'mdi:image' },
  { value: 'videos', label: 'Videos', icon: 'mdi:video' },
  { value: 'status', label: 'Status', icon: 'mdi:shield-lock' },
];

export default function EditBotView() {
  const router = useRouter();
  const params = useParams();
  const botId = Number(params?.id);

  const [bot, setBot] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [actionText, setActionText] = useState('Working...');
  const [currentTab, setCurrentTab] = useState('identity');
  const [avatarPreview, setAvatarPreview] = useState(null);

  // MEDIA STATE
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
  const safeTrim = (v) => (typeof v === 'string' ? v.trim() : '');
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

  // ----------------------- BOT: fetch -----------------------
  const fetchBot = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    if (!botId || !Number.isFinite(botId)) {
      toast.error('Invalid bot id in URL');
      router.push(paths?.dashboard?.bots?.root || '/dashboard/bots');
      return;
    }

    try {
      setPageLoading(true);
      const url = safeJoin(CONFIG.apiUrl, `v1/admin/bots/${botId}`);

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || res?.data?.msg || 'Failed to fetch bot');
        router.push(paths?.dashboard?.bots?.root || '/dashboard/bots');
        return;
      }

      const user = res?.data?.data?.user || res?.data?.data || null;
      setBot(user);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while fetching bot');
      router.push(paths?.dashboard?.bots?.root || '/dashboard/bots');
    } finally {
      setPageLoading(false);
    }
  }, [botId, router]);

  useEffect(() => {
    fetchBot();
  }, [fetchBot]);

  // ----------------------- defaults -----------------------
  const defaults = useMemo(
    () => ({
      email: bot?.email || '',
      phone: bot?.phone || '',
      password: '',

      status: Number.isFinite(bot?.status) ? Number(bot?.status) : '',
      is_active: Number.isFinite(bot?.is_active) ? Number(bot?.is_active) : 1,
      is_verified: Number.isFinite(bot?.is_verified) ? Number(bot?.is_verified) : 0,
      is_deleted: Number.isFinite(bot?.is_deleted) ? Number(bot?.is_deleted) : '',

      full_name: bot?.full_name || '',
      gender: bot?.gender || '',
      dob: bot?.dob ? String(bot?.dob).slice(0, 10) : '',
      bio: bot?.bio || '',
      interests: bot?.interests || '',
      looking_for: bot?.looking_for || '',
      height: bot?.height ?? '',
      education: bot?.education || '',

      country: bot?.country || '',
      state: bot?.state || '',
      city: bot?.city || '',
      address: bot?.address || '',

      avatar: null,
    }),
    [bot]
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
    if (!bot) return;

    reset(defaults);
    setAvatarPreview(null);
    setCurrentTab('identity');

    setNewImages([]);
    setNewVideos([]);
    setImagePreviews([]);
    setVideoPreviews([]);
  }, [bot, defaults, reset]);

  const avatarFile = watch('avatar');

  useEffect(() => {
    if (avatarFile instanceof File && avatarFile.type?.startsWith('image/')) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
    return undefined;
  }, [avatarFile]);

  const editAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;

    const a = String(bot?.avatar || '').trim();
    if (!a) return '';

    if (a.startsWith('http')) return a;
    if (a.startsWith('/uploads/') || a.startsWith('uploads/')) return publicUrlFromPath(a);

    // avatar stored as filename only
    return publicUrlFromPath(`uploads/avatar/user/${a}`);
  };

  const isTabError = (tabValue) => {
    const fields = TAB_FIELDS[tabValue];
    if (!fields) return false;
    return fields.some((f) => errors?.[f]);
  };

  const errorText = (path) => errors?.[path]?.message || '';

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  };

  const handleTabChange = useCallback((e, v) => setCurrentTab(v), []);

  const handleReset = () => {
    reset(defaults);
    setAvatarPreview(null);

    setNewImages([]);
    setNewVideos([]);
    setImagePreviews([]);
    setVideoPreviews([]);

    setCurrentTab('identity');
  };

  // ----------------------- MEDIA: fetch existing -----------------------
  const fetchMedia = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    if (!botId || !Number.isFinite(botId)) return;

    try {
      setMediaLoading(true);

      const imgUrl = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/media`);
      const vidUrl = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/video`);

      const [imgsRes, vidsRes] = await Promise.all([
        axios.get(imgUrl, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        }),
        axios.get(vidUrl, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        }),
      ]);

      if (!imgsRes?.data?.success) toast.error(imgsRes?.data?.message || 'Failed to fetch images');
      if (!vidsRes?.data?.success) toast.error(vidsRes?.data?.message || 'Failed to fetch videos');

      const imgList = imgsRes?.data?.data?.images || [];
      const vidList = vidsRes?.data?.data?.videos || [];

      setExistingImages(Array.isArray(imgList) ? imgList : []);
      setExistingVideos(Array.isArray(vidList) ? vidList : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch media');
    } finally {
      setMediaLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    if (!bot) return;
    fetchMedia();
  }, [bot, fetchMedia]);

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
  }, [JSON.stringify((newVideos || []).map((f) => `${f?.name}-${f?.size}-${f?.lastModified}`))]);

  const pickImages = (files) => {
    const arr = Array.from(files || []).filter((f) => String(f.type || '').startsWith('image/'));
    setNewImages((prev) => [...prev, ...arr]);
  };

  const pickVideos = (files) => {
    const arr = Array.from(files || []).filter((f) => String(f.type || '').startsWith('video/'));
    setNewVideos((prev) => [...prev, ...arr]);
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

  // ----------------------- IMAGES: upload + delete -----------------------
  const uploadImages = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      return;
    }
    if (!newImages.length) {
      toast.info('Please select images first.');
      return;
    }

    try {
      setLoading(true);
      setActionText('Uploading images...');

      const fd = new FormData();
      newImages.forEach((f) => fd.append('media', f));

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/media`);
      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to upload images');
        return;
      }

      toast.success(res?.data?.message || 'Images uploaded');
      setNewImages([]);
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while uploading images');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  const deleteExistingImage = async (mediaId) => {
    const token = getSessionToken();
    if (!token) return;

    try {
      setLoading(true);
      setActionText('Deleting image...');

      const url = safeJoin(
        CONFIG.apiUrl,
        `/v1/admin/bots/${botId}/media/${Number(mediaId)}/delete`
      );
      const res = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to delete image');
        return;
      }

      toast.success(res?.data?.message || 'Image deleted');
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while deleting image');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  // ----------------------- VIDEOS: upload + delete -----------------------
  const uploadVideos = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      return;
    }
    if (!newVideos.length) {
      toast.info('Please select videos first.');
      return;
    }

    try {
      setLoading(true);
      setActionText('Uploading videos...');

      const fd = new FormData();
      newVideos.forEach((f) => fd.append('files', f));

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/video`);
      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to upload videos');
        return;
      }

      toast.success(res?.data?.message || 'Videos uploaded');
      setNewVideos([]);
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while uploading videos');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  const deleteExistingVideo = async (videoId) => {
    const token = getSessionToken();
    if (!token) return;

    try {
      setLoading(true);
      setActionText('Deleting video...');

      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}/video/${Number(videoId)}`);
      const res = await axios.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to delete video');
        return;
      }

      toast.success(res?.data?.message || 'Video deleted');
      await fetchMedia();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while deleting video');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  // ----------------------- UPDATE BOT -----------------------
  const buildFormDataDiff = (vals) => {
    const fd = new FormData();
    const initial = defaults;

    let changed = false;
    const append = (k, v) => {
      fd.append(k, v);
      changed = true;
    };

    if (
      String(vals.email || '')
        .trim()
        .toLowerCase() !==
      String(initial.email || '')
        .trim()
        .toLowerCase()
    ) {
      append(
        'email',
        String(vals.email || '')
          .trim()
          .toLowerCase()
      );
    }
    if (safeTrim(vals.phone) !== safeTrim(initial.phone)) append('phone', safeTrim(vals.phone));

    if (safeTrim(vals.password)) append('password', String(vals.password));

    if (vals.status !== '' && Number(vals.status) !== Number(initial.status))
      append('status', String(Number(vals.status)));
    if (vals.is_active !== '' && Number(vals.is_active) !== Number(initial.is_active))
      append('is_active', Number(vals.is_active) === 1 ? 'true' : 'false');
    if (vals.is_verified !== '' && Number(vals.is_verified) !== Number(initial.is_verified))
      append('is_verified', Number(vals.is_verified) === 1 ? 'true' : 'false');
    if (vals.is_deleted !== '' && Number(vals.is_deleted) !== Number(initial.is_deleted))
      append('is_deleted', String(Number(vals.is_deleted)));

    if (safeTrim(vals.full_name) !== safeTrim(initial.full_name))
      append('full_name', safeTrim(vals.full_name));
    if (safeTrim(vals.gender) !== safeTrim(initial.gender)) append('gender', safeTrim(vals.gender));
    if (safeTrim(vals.dob) !== safeTrim(initial.dob)) append('dob', safeTrim(vals.dob));
    if (safeTrim(vals.bio) !== safeTrim(initial.bio)) append('bio', String(vals.bio ?? ''));

    const interestsNow = normalizeCSV6(vals.interests);
    const interestsInit = normalizeCSV6(initial.interests);
    if (interestsNow !== interestsInit) append('interests', interestsNow);

    if (safeTrim(vals.looking_for) !== safeTrim(initial.looking_for))
      append('looking_for', safeTrim(vals.looking_for));
    if (safeTrim(vals.height) !== safeTrim(initial.height)) append('height', safeTrim(vals.height));
    if (safeTrim(vals.education) !== safeTrim(initial.education))
      append('education', safeTrim(vals.education));

    if (safeTrim(vals.country) !== safeTrim(initial.country))
      append('country', safeTrim(vals.country));
    if (safeTrim(vals.state) !== safeTrim(initial.state)) append('state', safeTrim(vals.state));
    if (safeTrim(vals.city) !== safeTrim(initial.city)) append('city', safeTrim(vals.city));
    if (safeTrim(vals.address) !== safeTrim(initial.address))
      append('address', safeTrim(vals.address));

    const av = vals.avatar;

    if (isFileLike(av)) {
      append('avatar', av);
    } else if (av && av?.length && isFileLike(av[0])) {
      append('avatar', av[0]);
    }

    return { fd, changed };
  };
  const onSubmit = async (values) => {
    const token = getSessionToken();

    if (!token) {
      toast.error('Session expired. Please login again.');
      router.push(paths?.auth?.login || '/login');
      return;
    }

    if (!botId) {
      toast.error('Missing bot id');
      return;
    }

    try {
      setLoading(true);
      setActionText('Updating bot...');

      const { fd, changed } = buildFormDataDiff(values);

      if (!changed) {
        toast.info('No changes to update.');
        return;
      }
      const url = safeJoin(CONFIG.apiUrl, `/v1/admin/bots/${botId}`);

      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || res?.data?.msg || 'Failed to update bot');
        return;
      }

      toast.success(res?.data?.message || 'Bot updated');
      router.push(paths?.dashboard?.bots?.root || '/dashboard/bots');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while updating bot');
    } finally {
      setLoading(false);
      setActionText('Working...');
    }
  };

  if (pageLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography variant="body2" color="text.secondary">
          Loading bot...
        </Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={`Edit Bot #${botId}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bots', href: paths?.dashboard?.bots?.root || '/dashboard/bots' },
          { name: `Edit #${botId}` },
        ]}
        sx={{ mb: 3 }}
      />

      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
        {Object.keys(errors || {}).length > 0 && (
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
          {/* ---------------- TABS ---------------- */}
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
                          <Avatar src={editAvatarSrc()} sx={{ width: '100%', height: '100%' }} />
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

                        {avatarFile && (
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
                              <TextField {...field} label="Username" fullWidth />
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
                            render={({ field }) => <TextField {...field} label="Phone" fullWidth />}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Password (leave blank to keep current)"
                                type="password"
                                fullWidth
                              />
                            )}
                          />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 3 }} />
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
                    <Grid item xs={12} sm={6}>
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
                        {!!errors.gender && <FormHelperText>{errorText('gender')}</FormHelperText>}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="dob"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} label="DOB (YYYY-MM-DD)" fullWidth />
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
                              <MenuItem value="">Default</MenuItem>
                              {LookingFor.map((x) => (
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
                        render={({ field }) => <TextField {...field} label="Education" fullWidth />}
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
                            label="Interests (max 6, comma separated)"
                            fullWidth
                            helperText="Example: Music, Travel, Gym, Movies"
                            onBlur={(e) => field.onChange(normalizeCSV6(e.target.value))}
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
                            valueCode={field.value || ''}
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
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto' }}>
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
                        onClick={uploadImages}
                        disabled={loading || !newImages.length}
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
                          const src = getImageSrc(row, botId);

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
                                      deleteExistingImage(row.id);
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

                              {/*  Removed filename text under image */}
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

                    <Typography variant="subtitle2">Selected (New) ({newImages.length})</Typography>

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

                            {/*  No filename text for selected images */}
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

              {/* VIDEOS TAB */}
              {currentTab === 'videos' && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="mdi:video" width={20} />
                      <Typography variant="h6">Videos</Typography>

                      {(mediaLoading || loading) && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto' }}>
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
                        startIcon={<Iconify icon="mdi:video" />}
                        disabled={loading}
                      >
                        Select Videos
                        <input
                          hidden
                          multiple
                          type="file"
                          accept="video/*"
                          onChange={(e) => pickVideos(e.target.files)}
                        />
                      </Button>

                      <Button
                        variant="contained"
                        color="success"
                        onClick={uploadVideos}
                        disabled={loading || !newVideos.length}
                      >
                        Upload
                      </Button>
                    </Stack>

                    <Divider />

                    <Typography variant="subtitle2">
                      Already Uploaded ({existingVideos.length})
                    </Typography>

                    {existingVideos.length ? (
                      <Stack spacing={1.5}>
                        {existingVideos.map((v) => {
                          const src = getVideoSrc(v, botId);

                          return (
                            <Box
                              key={v.id ?? `${v.name}-${v.created_at}`}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                p: 1.5,
                              }}
                            >
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                alignItems={{ sm: 'center' }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <video
                                    src={src}
                                    controls
                                    style={{ width: '30%', borderRadius: 12 }}
                                  />
                                </Box>

                                <Box sx={{ width: { xs: '100%', sm: 300 } }}>
                                  <Typography variant="body2" noWrap>
                                    {v.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {v.file_type} • {fileSize(v.size)}
                                  </Typography>

                                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      startIcon={<Iconify icon="mdi:delete" />}
                                      onClick={() => deleteExistingVideo(v.id)}
                                      disabled={loading}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Box>
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No videos uploaded yet.
                      </Typography>
                    )}

                    <Divider />

                    <Typography variant="subtitle2">Selected (New) ({newVideos.length})</Typography>

                    {videoPreviews.length ? (
                      <Stack spacing={1.5}>
                        {videoPreviews.map((x, idx) => (
                          <Box
                            key={`${x.file.name}-${idx}`}
                            sx={{
                              border: '1px dashed',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              p: 1.5,
                            }}
                          >
                            <video
                              src={x.url}
                              controls
                              style={{ width: '100%', borderRadius: 12 }}
                            />

                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ mt: 1 }}
                            >
                              <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                                {x.file.name}
                              </Typography>

                              <Tooltip title="Remove selected">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeNewVideoAt(idx)}
                                  disabled={loading}
                                >
                                  <Iconify icon="mdi:close" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No new videos selected.
                      </Typography>
                    )}
                  </Stack>
                </Card>
              )}

              {/* STATUS TAB */}
              {currentTab === 'status' && (
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    Status
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
                              <MenuItem value={0}>Pending</MenuItem>
                              <MenuItem value={1}>Active</MenuItem>
                              <MenuItem value={2}>Suspended</MenuItem>
                              <MenuItem value={3}>Disabled</MenuItem>
                            </Select>
                          )}
                        />
                        {!!errors.status && <FormHelperText>{errorText('status')}</FormHelperText>}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={!!errors.is_active}>
                        <InputLabel>Active</InputLabel>
                        <Controller
                          name="is_active"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Active" disabled={loading}>
                              <MenuItem value="">Default</MenuItem>
                              <MenuItem value={1}>On</MenuItem>
                              <MenuItem value={0}>Off</MenuItem>
                            </Select>
                          )}
                        />
                        {!!errors.is_active && (
                          <FormHelperText>{errorText('is_active')}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={!!errors.is_verified}>
                        <InputLabel>Verified</InputLabel>
                        <Controller
                          name="is_verified"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Verified" disabled={loading}>
                              <MenuItem value="">Default</MenuItem>
                              <MenuItem value={1}>Yes</MenuItem>
                              <MenuItem value={0}>No</MenuItem>
                            </Select>
                          )}
                        />
                        {!!errors.is_verified && (
                          <FormHelperText>{errorText('is_verified')}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth error={!!errors.is_deleted}>
                        <InputLabel>Deleted</InputLabel>
                        <Controller
                          name="is_deleted"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} label="Deleted" disabled={loading}>
                              <MenuItem value="">Default</MenuItem>
                              <MenuItem value={0}>No</MenuItem>
                              <MenuItem value={1}>Yes</MenuItem>
                            </Select>
                          )}
                        />
                        {!!errors.is_deleted && (
                          <FormHelperText>{errorText('is_deleted')}</FormHelperText>
                        )}
                      </FormControl>
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
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button
                  variant="soft"
                  color="inherit"
                  onClick={() => router.push(paths?.dashboard?.bots?.root || '/dashboard/bots')}
                >
                  Cancel
                </Button>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleReset}
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
                    {loading ? 'Updating...' : 'Update Bot'}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
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
