/* eslint-disable consistent-return */

'use client';

import axios from 'axios';
import { toast } from 'react-toastify';
import { getCookie } from 'minimal-shared';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { paths } from 'src/routes/paths';

import { isBlank, safeJoin, SectionTitle, toNullIfEmpty } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAppContext } from 'src/contexts/app-context';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function UpdateAdminProfileView() {
  const router = useRouter();
  const token = getCookie('session_key');

  const { user, setUser } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  const baselineRef = useRef({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    avatar: '',
    updatedAt: '',
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      old_password: '',
      password: '',
      avatar: null,
    },
    mode: 'onBlur',
  });

  const avatarFile = watch('avatar');

  useEffect(() => {
    if (avatarFile instanceof File) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(null);
  }, [avatarFile]);

  // . show avatar from context
  // AFTER
  const currentAvatarUrl = useMemo(() => {
    const filename = user?.avatar || '';
    if (!filename) return '';
    // Only add cache bust after an upload (avatarRefreshKey changes),
    // otherwise use a stable URL so it doesn't flicker on mount
    const bust = encodeURIComponent(String(avatarRefreshKey));
    return safeJoin(CONFIG.assetsUrl, `uploads/avatar/admin/${filename}?v=${bust}`);
  }, [user?.avatar, avatarRefreshKey]);
  const fetchProfile = async () => {
    try {
      if (!token) return;

      const url = safeJoin(CONFIG.apiUrl, 'v1/admin/profile');
      //    setAvatarRefreshKey(Date.now());

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const data = res?.data;

      if (res.status === 401 || res.status === 403) {
        toast.error(data?.msg || data?.message || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!data?.success || !data?.data) {
        toast.error(data?.msg || data?.message || 'Failed to fetch profile');
        return;
      }

      const p = data.data;

      // . update baseline snapshot
      baselineRef.current = {
        username: p?.username || '',
        email: p?.email || '',
        first_name: p?.first_name || '',
        last_name: p?.last_name || '',
        avatar: p?.avatar || '',
        updatedAt: p?.updatedAt || p?.updated_at || '',
      };

      // . update app context (for Avatar rendering everywhere)
      setUser(p);
      setAvatarRefreshKey(Date.now());
      try {
        localStorage.setItem('user', JSON.stringify(p));
        // force listeners
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        // ignore
      }

      // . reset RHF with latest server values
      reset({
        username: baselineRef.current.username,
        email: baselineRef.current.email,
        first_name: baselineRef.current.first_name,
        last_name: baselineRef.current.last_name,
        old_password: '',
        password: '',
        avatar: null,
      });

      setAvatarPreview(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch profile');
    }
  };

  // fetch once on mount
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildFormDataDiff = (vals) => {
    const fd = new FormData();
    const base = baselineRef.current;

    // username
    if (String(vals.username || '').trim() !== String(base.username || '').trim()) {
      const v = String(vals.username || '').trim();
      if (!isBlank(v)) fd.append('username', String(v));
    }

    // email
    if (
      String(vals.email || '')
        .trim()
        .toLowerCase() !==
      String(base.email || '')
        .trim()
        .toLowerCase()
    ) {
      const v = String(vals.email || '')
        .trim()
        .toLowerCase();
      if (!isBlank(v)) fd.append('email', String(v));
    }

    // names (nullable)
    if (toNullIfEmpty(vals.first_name) !== toNullIfEmpty(base.first_name)) {
      fd.append('first_name', toNullIfEmpty(vals.first_name));
    }

    if (toNullIfEmpty(vals.last_name) !== toNullIfEmpty(base.last_name)) {
      fd.append('last_name', toNullIfEmpty(vals.last_name));
    }

    // password change
    if (!isBlank(vals.password)) {
      fd.append('password', vals.password);
      if (!isBlank(vals.old_password)) fd.append('old_password', String(vals.old_password));
    }

    // avatar file
    if (vals.avatar instanceof File) {
      fd.append('avatar', vals.avatar);
    }

    return fd;
  };

  const onSubmit = async (values) => {
    try {
      if (!token) {
        toast.error('Session expired. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      // guard for password
      if (!isBlank(values.password) && isBlank(values.old_password)) {
        toast.error('Old password is required to change password.');
        return;
      }

      const fd = buildFormDataDiff(values);

      if ([...fd.keys()].length === 0) {
        toast.info('No changes to update.');
        return;
      }

      setLoading(true);

      const url = safeJoin(CONFIG.apiUrl, 'v1/admin/update-profile');

      const res = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const data = res?.data;

      if (res.status === 401 || res.status === 403) {
        toast.error(data?.msg || data?.message || 'Unauthorized. Please login again.');
        router.push(paths?.auth?.login || '/login');
        return;
      }

      if (!data?.success) {
        toast.error(data?.msg || data?.message || 'Failed to update profile');
        return;
      }

      toast.success(data?.msg || 'Profile updated successfully.');

      // . Always refetch profile after update
      await fetchProfile();

      // clear local-only fields
      setValue('password', '');
      setValue('old_password', '');
      setValue('avatar', null);
      setAvatarPreview(null);
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const base = baselineRef.current;
    reset({
      username: base.username,
      email: base.email,
      first_name: base.first_name,
      last_name: base.last_name,
      old_password: '',
      password: '',
      avatar: null,
    });
    setAvatarPreview(null);
  };

  const errorText = (path) => errors?.[path]?.message || '';

  return (
    <DashboardContent maxWidth="lg">
      <CustomBreadcrumbs
        heading="My Profile"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Profile' }]}
        sx={{ mb: 2 }}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4} lg={3}>
            <Card
              variant="outlined"
              sx={{
                p: 2,
                position: { md: 'sticky' },
                top: { md: 16 },
                borderRadius: 2.5,
                borderColor: 'divider',
              }}
            >
              <Stack spacing={2}>
                <SectionTitle>Profile Picture</SectionTitle>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Avatar
                    src={avatarPreview || currentAvatarUrl}
                    alt="avatar"
                    sx={{
                      width: 72,
                      height: 72,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.neutral',
                    }}
                    imgProps={{
                      onError: (e) => {
                        e.currentTarget.src = '/assets/images/avatar_default.png';
                      },
                    }}
                  />

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Controller
                      name="avatar"
                      control={control}
                      render={({ field }) => (
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<Iconify icon="mdi:upload" />}
                          sx={{ textTransform: 'none' }}
                        >
                          Upload
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
                          />
                        </Button>
                      )}
                    />

                    {avatarPreview && (
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => setValue('avatar', null)}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Iconify icon="mdi:close" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>

                <Divider />

                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    Tips
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use a square image (≥ 256×256). PNG or JPG recommended.
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} md={8} lg={9}>
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                <Stack spacing={2}>
                  <SectionTitle>Identity</SectionTitle>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Username"
                            fullWidth
                            error={!!errors.username}
                            helperText={errorText('username')}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="email"
                        disabled
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Email"
                            fullWidth
                            error={!!errors.email}
                            helperText={errorText('email')}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="first_name"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field} label="First Name" fullWidth />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="last_name"
                        control={control}
                        render={({ field }) => <TextField {...field} label="Last Name" fullWidth />}
                      />
                    </Grid>
                  </Grid>

                  <Divider flexItem />
                </Stack>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  position: { md: 'sticky' },
                  bottom: 0,
                  zIndex: 5,
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                  backdropFilter: 'saturate(180%) blur(6px)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between', width: '100%' }}
                >
                  <Button
                    color="inherit"
                    onClick={() => router.push(paths?.dashboard?.root || paths.dashboard.root)}
                    startIcon={<Iconify icon="mdi:arrow-left" />}
                    sx={{ flexShrink: 0, width: '150px' }}
                  >
                    Cancel
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmit(onSubmit)}
                      disabled={loading}
                      startIcon={<Iconify icon="mdi:content-save" />}
                      sx={{ width: '150px' }}
                    >
                      {loading ? 'Saving…' : 'Save'}
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={handleReset}
                      startIcon={<Iconify icon="mdi:refresh" />}
                      sx={{ width: '150px' }}
                    >
                      Reset
                    </Button>
                  </Box>
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </LocalizationProvider>
    </DashboardContent>
  );
}
