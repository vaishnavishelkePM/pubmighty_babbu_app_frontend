'use client';

/* eslint-disable consistent-return */

import { z } from 'zod';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Slide from '@mui/material/Slide';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';

import { safeJoin, getSessionToken, SectionTitle, isBlank } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

const Schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    description: z.string().trim().max(5000).optional().or(z.literal('')),

    coins: z.coerce.number().int().min(1, 'Coins must be at least 1'),
    price: z.coerce.number().min(0, 'Price must be >= 0'),

    discount_type: z.enum(['percentage', 'flat']).default('percentage'),
    discount_value: z.coerce.number().min(0, 'Discount must be >= 0').default(0),

    is_popular: z.enum(['0', '1']).default('0'),
    is_ads_free: z.enum(['0', '1']).default('0'),

    validity_days: z.coerce.number().int().min(0).default(0),
    display_order: z.coerce.number().int().min(0).default(0),

    status: z.enum(['active', 'inactive']).default('active'),
    provider: z.enum(['google_play']).default('google_play'),

    google_product_id: z.string().trim().max(100).optional().or(z.literal('')),
    currency: z.string().trim().max(10).default('INR'),

    cover: z.any().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.discount_type === 'percentage' && Number(val.discount_value) > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount_value'],
        message: 'Percentage discount cannot exceed 100',
      });
    }
  });

export default function EditCoinPackageDialog({ open, onClose, coinPackageId, onUpdated }) {
  const id = useMemo(() => (coinPackageId ? String(coinPackageId) : ''), [coinPackageId]);

  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingCover, setExistingCover] = useState('');
  const [coverPreview, setCoverPreview] = useState(null);

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
      name: '',
      description: '',
      coins: 100,
      price: 99,
      discount_type: 'percentage',
      discount_value: 0,
      is_popular: '0',
      is_ads_free: '0',
      validity_days: 0,
      display_order: 0,
      status: 'active',
      provider: 'google_play',
      google_product_id: '',
      currency: 'INR',
      cover: null,
    },
    mode: 'onBlur',
  });

  const coverFile = watch('cover');
  const coverSrc = (cover) => {
    if (!cover) return '';
    if (String(cover).startsWith('http')) return String(cover);
    return safeJoin(CONFIG.assetsUrl, `images/coin-packages/${cover}`);
  };

  useEffect(() => {
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreview(null);
  }, [coverFile]);

  const closeSafe = () => {
    if (saving) return;
    onClose?.();
  };

  const toBoolStr = (v) => (String(v) === '1' || v === true ? 'true' : 'false');
  const fetchDetails = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      closeSafe();
      return;
    }
    if (!CONFIG?.apiUrl) {
      toast.error('CONFIG.apiUrl missing. Fix src/global-config');
      return;
    }
    if (!id) return;

    try {
      setFetching(true);

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/${id}`);
      const result = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        closeSafe();
        return;
      }

      if (!res?.success) {
        toast.error(res?.msg || res?.message || `Failed (HTTP ${result.status})`);
        return;
      }

      const d = res?.data || {};
      setExistingCover(d?.cover || '');
      setCoverPreview(null);
      setValue('cover', null);

      reset({
        name: d?.name || '',
        description: d?.description || '',
        coins: Number(d?.coins ?? 0),
        price: Number(d?.price ?? 0),
        discount_type: d?.discount_type === 'flat' ? 'flat' : 'percentage',
        discount_value: Number(d?.discount_value ?? 0),
        is_popular: d?.is_popular ? '1' : '0',
        is_ads_free: d?.is_ads_free ? '1' : '0',
        validity_days: Number(d?.validity_days ?? 0),
        display_order: Number(d?.display_order ?? 0),
        status: d?.status === 'inactive' ? 'inactive' : 'active',
        provider: 'google_play',
        google_product_id: d?.google_product_id || '',
        currency: d?.currency || 'INR',
        cover: null,
      });
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while fetching details');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!open || !id) return;
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  const onSubmit = async (values) => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      closeSafe();
      return;
    }

    if (!CONFIG?.apiUrl) {
      toast.error('CONFIG.apiUrl missing. Fix src/global-config');
      return;
    }

    if (!id) {
      toast.error('coinPackageId missing');
      return;
    }

    try {
      setSaving(true);

      const fd = new FormData();

      fd.append('name', values.name.trim());
      if (!isBlank(values.description)) fd.append('description', String(values.description).trim());

      fd.append('coins', String(Number(values.coins)));
      fd.append('price', String(Number(values.price)));

      fd.append('discount_type', values.discount_type);
      fd.append('discount_value', String(Number(values.discount_value || 0)));

      fd.append('is_popular', toBoolStr(values.is_popular));
      fd.append('is_ads_free', toBoolStr(values.is_ads_free));

      fd.append('validity_days', String(Number(values.validity_days || 0)));
      fd.append('display_order', String(Number(values.display_order || 0)));

      fd.append('status', values.status);
      fd.append('provider', values.provider || 'google_play');

      if (!isBlank(values.google_product_id))
        fd.append('google_product_id', values.google_product_id.trim());
      if (!isBlank(values.currency)) fd.append('currency', values.currency.trim());

      if (values.cover instanceof File) fd.append('cover', values.cover);

      const url = safeJoin(CONFIG.apiUrl, `v1/admin/coin-packages/${id}`);
      const result = await axios.post(url, fd, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      });

      const res = result?.data;

      if (result.status === 401 || result.status === 403) {
        toast.error(res?.msg || res?.message || 'Unauthorized. Please login again.');
        closeSafe();
        return;
      }

      if (!res?.success) {
        toast.error(res?.msg || res?.message || `Failed (HTTP ${result.status})`);
        return;
      }

      toast.success(res?.msg || res?.message || 'Coin package updated');

      const updated = res?.data || null;
      setExistingCover(updated?.cover || existingCover);
      setValue('cover', null);
      setCoverPreview(null);

      onUpdated?.(updated);
      closeSafe();
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while updating coin package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeSafe}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon="mdi:cash-edit" />
        Edit Coin Package {id ? `#${id}` : ''}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={closeSafe} color="inherit" startIcon={<Iconify icon="mdi:close" />}>
          Close
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4} lg={3}>
            <Card
              variant="outlined"
              sx={{ p: 2, position: { md: 'sticky' }, top: { md: 16 }, borderRadius: 2.5 }}
            >
              <Stack spacing={2}>
                <SectionTitle>Cover</SectionTitle>

                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}
                >
                  <Avatar
                    variant="rounded"
                    src={coverPreview || coverSrc(existingCover) || undefined}
                    alt="cover"
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  />

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Controller
                      name="cover"
                      control={control}
                      render={({ field }) => (
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<Iconify icon="mdi:upload" />}
                          sx={{ textTransform: 'none' }}
                          disabled={fetching || saving}
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

                    {(coverPreview || coverFile) && (
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => setValue('cover', null)}
                          sx={{ border: '1px solid', borderColor: 'divider' }}
                          disabled={fetching || saving}
                        >
                          <Iconify icon="mdi:close" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>

                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Tips: PNG/JPG/WEBP recommended.
                </Typography>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} md={8} lg={9}>
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                {fetching ? (
                  <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    <SectionTitle>Package</SectionTitle>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Name *"
                              fullWidth
                              error={!!errors.name}
                              helperText={errors?.name?.message}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth error={!!errors.status}>
                              <InputLabel>Status</InputLabel>
                              <Select {...field} label="Status">
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                              </Select>
                              {!!errors.status && (
                                <FormHelperText>{errors?.status?.message}</FormHelperText>
                              )}
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Controller
                          name="description"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Description"
                              fullWidth
                              multiline
                              minRows={3}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>

                    <Divider />

                    <SectionTitle>Pricing</SectionTitle>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="coins"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Coins *"
                              type="number"
                              fullWidth
                              error={!!errors.coins}
                              helperText={errors?.coins?.message}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="price"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Price *"
                              type="number"
                              fullWidth
                              error={!!errors.price}
                              helperText={errors?.price?.message}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="currency"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Currency" fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="discount_type"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Discount Type</InputLabel>
                              <Select {...field} label="Discount Type">
                                <MenuItem value="percentage">Percentage</MenuItem>
                                <MenuItem value="flat">Flat</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="discount_value"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Discount Value"
                              type="number"
                              fullWidth
                              error={!!errors.discount_value}
                              helperText={errors?.discount_value?.message}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="display_order"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Display Order" type="number" fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="validity_days"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} label="Validity Days" type="number" fullWidth />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="is_popular"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Popular</InputLabel>
                              <Select {...field} label="Popular">
                                <MenuItem value="0">No</MenuItem>
                                <MenuItem value="1">Yes</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="is_ads_free"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Ads Free</InputLabel>
                              <Select {...field} label="Ads Free">
                                <MenuItem value="0">No</MenuItem>
                                <MenuItem value="1">Yes</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>
                    </Grid>

                    <Divider />

                    <SectionTitle>Provider</SectionTitle>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Controller
                          name="provider"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Provider</InputLabel>
                              <Select {...field} label="Provider">
                                <MenuItem value="google_play">Google Play</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <Controller
                          name="google_product_id"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Google Product ID (optional, unique)"
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}
              </Card>

              <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Button
                    color="inherit"
                    onClick={closeSafe}
                    startIcon={<Iconify icon="mdi:arrow-left" />}
                    sx={{ width: 170 }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit(onSubmit)}
                      disabled={saving || fetching}
                      startIcon={<Iconify icon="mdi:content-save" />}
                      sx={{ width: 170 }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={fetchDetails}
                      disabled={fetching || saving}
                      startIcon={<Iconify icon="mdi:refresh" />}
                      sx={{ width: 170 }}
                    >
                      Reset
                    </Button>
                  </Box>
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
