'use client';

import { useMemo, useState } from 'react';
import { Pie, Line } from 'react-chartjs-2';

import { alpha } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';
import {
  Box,
  Card,
  Chip,
  Grid,
  Stack,
  Table,
  Avatar,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

import { TableSortFilter, getAvatarUrl } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import CountryBadge from 'src/components/chip/country-badge';



export default function RevenueTab({
  loading,
  revenueData,
  chartColors,
  lineChartOptions,
  formatNumber,
  formatCurrency,
  formatCurrencyCompact,
  KpiCard,
  getCountryName,
  ChartSkeleton,
  TableSkeleton,
  theme,
}) {
  const [userSort, setUserSort] = useState('highest_revenue');
  const [countrySort, setCountrySort] = useState('highest_revenue');

  const safeData =
    revenueData && typeof revenueData === 'object'
      ? revenueData
      : { total: { purchases: 0, revenue: 0 }, per_day: [], by_country: [], top_users: [] };

  const totalPurchases = Number(safeData?.total?.purchases || 0);
  const totalRevenue = Number(safeData?.total?.revenue || 0);

  const perDay = Array.isArray(safeData?.per_day) ? safeData.per_day : [];
  const byCountry = Array.isArray(safeData?.by_country) ? safeData.by_country : [];
  const topUsers = Array.isArray(safeData?.top_users) ? safeData.top_users : [];

  const sortedPerDay = [...perDay].sort((a, b) => new Date(a.day) - new Date(b.day));

  const labels =
    sortedPerDay.length > 0
      ? sortedPerDay.map((d) =>
          new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        )
      : ['—'];

  const revenueValues =
    sortedPerDay.length > 0 ? sortedPerDay.map((d) => Number(d.revenue || 0)) : [0];
  const purchaseCounts =
    sortedPerDay.length > 0 ? sortedPerDay.map((d) => Number(d.purchases || 0)) : [0];

  const revenueLineData = {
    labels,
    datasets: [
      {
        label: 'Revenue (₹)',
        data: revenueValues,
        borderColor: chartColors.success,
        backgroundColor: alpha(chartColors.success, 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: chartColors.success,
        pointBorderColor: theme.palette.background.paper,
        pointBorderWidth: 2,
      },
    ],
  };

  const purchaseLineData = {
    labels,
    datasets: [
      {
        label: 'Purchases',
        data: purchaseCounts,
        borderColor: chartColors.primary,
        backgroundColor: alpha(chartColors.primary, 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: theme.palette.background.paper,
        pointBorderWidth: 2,
      },
    ],
  };

  const topCountry = useMemo(() => {
    if (!byCountry.length) return null;
    return [...byCountry].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))[0];
  }, [byCountry]);

  const top10Countries = useMemo(() => byCountry.slice(0, 10), [byCountry]);

  const topCountryCode = String(topCountry?.country || '')
    .trim()
    .toUpperCase();
  const isUnknownTopCountry =
    !topCountryCode || ['UNKNOWN', 'N/A', 'NA', 'NULL'].includes(topCountryCode);

  const pieChartData = useMemo(() => {
    if (top10Countries.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [1],
            backgroundColor: [alpha(theme.palette.grey[500], 0.3)],
            borderColor: [theme.palette.background.paper],
            borderWidth: 2,
          },
        ],
      };
    }
    const colors = [
      chartColors.primary,
      chartColors.success,
      chartColors.info,
      chartColors.warning,
      chartColors.error,
      alpha(chartColors.primary, 0.7),
      alpha(chartColors.success, 0.7),
      alpha(chartColors.info, 0.7),
      alpha(chartColors.warning, 0.7),
      alpha(chartColors.error, 0.7),
    ];
    return {
      labels: top10Countries.map((c) => getCountryName(c.country)),
      datasets: [
        {
          data: top10Countries.map((c) => Number(c.revenue || 0)),
          backgroundColor: colors.map((color) => alpha(color, 0.8)),
          borderColor: colors.map(() => theme.palette.background.paper),
          borderWidth: 2,
        },
      ],
    };
  }, [top10Countries, chartColors, theme, getCountryName]);

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 12, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle' },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = formatCurrency(context.parsed);
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  const top5Users = useMemo(() => topUsers.slice(0, 5), [topUsers]);

  const sortedUsers = useMemo(() => {
    const users = [...topUsers];
    switch (userSort) {
      case 'highest_revenue':
        return users.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
      case 'lowest_revenue':
        return users.sort((a, b) => Number(a.revenue || 0) - Number(b.revenue || 0));
      case 'highest_purchases':
        return users.sort((a, b) => Number(b.purchases || 0) - Number(a.purchases || 0));
      case 'lowest_purchases':
        return users.sort((a, b) => Number(a.purchases || 0) - Number(b.purchases || 0));
      default:
        return users;
    }
  }, [topUsers, userSort]);

  const sortedCountries = useMemo(() => {
    const countries = [...byCountry];
    switch (countrySort) {
      case 'highest_revenue':
        return countries.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
      case 'lowest_revenue':
        return countries.sort((a, b) => Number(a.revenue || 0) - Number(b.revenue || 0));
      case 'highest_purchases':
        return countries.sort((a, b) => Number(b.purchases || 0) - Number(a.purchases || 0));
      case 'lowest_purchases':
        return countries.sort((a, b) => Number(a.purchases || 0) - Number(b.purchases || 0));
      default:
        return countries;
    }
  }, [byCountry, countrySort]);

  const getRankColor = (index) => {
    const colors = [
      '#FFD700',
      '#C0C0C0',
      '#CD7F32',
      theme.palette.primary.main,
      theme.palette.info.main,
    ];
    return colors[index] || theme.palette.grey[500];
  };

  // ─── Loading skeleton (after all hooks) ──────────────────────────────────────
  if (loading && !revenueData) {
    return (
      <>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <KpiCard loading />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, height: 480 }}>
              <Skeleton width="40%" height={28} sx={{ mb: 2 }} />
              <Skeleton height={420} />
            </Card>
          </Grid>
        </Grid>
        <Card>
          <TableSkeleton rows={8} cols={5} includeHeader dense={false} rounded />
        </Card>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Total Revenue"
            value={formatCurrencyCompact(totalRevenue)}
            icon="solar:dollar-bold"
            color="success"
            subtitle={
              totalPurchases > 0
                ? `From ${formatNumber(totalPurchases)} purchases`
                : 'No purchases in selected period'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Total Purchases"
            value={formatNumber(totalPurchases)}
            icon="solar:cart-check-bold"
            color="primary"
            subtitle={totalPurchases > 0 ? 'Completed transactions' : 'No transactions'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Top Country"
            value={topCountry ? getCountryName(topCountry.country) : '—'}
            icon="solar:map-point-bold"
            color="info"
            subtitle={
              topCountry
                ? `${formatCurrencyCompact(topCountry.revenue)} • ${formatNumber(topCountry.purchases)} purchases`
                : 'No country data'
            }
            rightSlot={
              isUnknownTopCountry ? (
                <Iconify icon="solar:map-point-bold" width={36} />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    component="img"
                    src={`https://flagcdn.com/w160/${topCountryCode.toLowerCase()}.png`}
                    alt={getCountryName(topCountryCode)}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                  />
                </Box>
              )
            }
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:dollar-bold" width={18} />}
          label="Revenue Analytics"
          color="success"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Revenue Trend + Daily Breakdown ──────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Revenue Trend
              </Typography>
              <Chip
                icon={<Iconify icon="solar:dollar-bold" width={16} />}
                label={formatCurrency(totalRevenue)}
                color="success"
                size="small"
              />
            </Stack>
            <Box sx={{ height: 320 }}>
              <Line data={revenueLineData} options={lineChartOptions} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Daily Revenue Breakdown
                </Typography>
                <Chip label={`${sortedPerDay.length} Days`} size="small" color="success" />
              </Stack>
            </Box>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Date
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Revenue
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Purchases
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPerDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No daily data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...sortedPerDay].reverse().map((row, index) => (
                      <TableRow
                        key={`revenue-${row.day}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(row.day).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="subtitle2"
                            color="success.main"
                            sx={{ fontWeight: 700 }}
                          >
                            {formatCurrency(Number(row.revenue || 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatNumber(Number(row.purchases || 0))}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:cart-check-bold" width={18} />}
          label="Purchase Analytics"
          color="primary"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Purchase Trend + Daily Breakdown ─────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Purchase Volume Trend
              </Typography>
              <Chip
                icon={<Iconify icon="solar:cart-check-bold" width={16} />}
                label={`${formatNumber(totalPurchases)} Total`}
                color="primary"
                size="small"
              />
            </Stack>
            <Box sx={{ height: 320 }}>
              <Line data={purchaseLineData} options={lineChartOptions} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Daily Purchase Breakdown
                </Typography>
                <Chip label={`${sortedPerDay.length} Days`} size="small" color="primary" />
              </Stack>
            </Box>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Date
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Purchases
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Revenue
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPerDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No daily data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...sortedPerDay].reverse().map((row, index) => (
                      <TableRow
                        key={`purchase-${row.day}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(row.day).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatNumber(Number(row.purchases || 0))}
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            {formatCurrency(Number(row.revenue || 0))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:global-bold" width={18} />}
          label="Country Analytics"
          color="info"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Country Analytics ─────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: 460 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Top 10 Countries
              </Typography>
              <Chip
                icon={<Iconify icon="solar:global-bold" width={14} />}
                label={`${top10Countries.length}`}
                size="small"
                color="info"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Pie data={pieChartData} options={pieChartOptions} />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={2}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Country Revenue Breakdown
                </Typography>
                <TableSortFilter
                  value={countrySort}
                  onChange={setCountrySort}
                  disabled={loading}
                  label="Sort Countries"
                />
              </Stack>
            </Box>
            <TableContainer sx={{ maxHeight: 390 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Rank
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Country
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Revenue
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Purchases
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedCountries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No country data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCountries.map((row, index) => (
                      <TableRow
                        key={`${row.country}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color={index < 3 ? 'warning' : 'default'}
                            variant={index < 3 ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <CountryBadge code={row.country} />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="subtitle2"
                            color="success.main"
                            sx={{ fontWeight: 700 }}
                          >
                            {formatCurrency(Number(row.revenue || 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatNumber(Number(row.purchases || 0))}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:user-bold" width={18} />}
          label="User Analytics"
          color="warning"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Top 5 Users Horizontal Slider ────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Top 5 Users by Revenue
              </Typography>
            </Stack>

            {top5Users.length === 0 ? (
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No user data available
                </Typography>
              </Card>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 2,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: alpha(theme.palette.grey[400], 0.08),
                    borderRadius: 3,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: alpha(theme.palette.grey[600], 0.3),
                    borderRadius: 3,
                    '&:hover': { bgcolor: alpha(theme.palette.grey[600], 0.5) },
                  },
                }}
              >
                {top5Users.map((userRow, index) => {
                  const user = userRow.user || {};
                  const purchases = Number(userRow.purchases || 0);
                  const revenue = Number(userRow.revenue || 0);
                  const rankColor = getRankColor(index);

                  return (
                    <Card
                      key={`top5-${user.id}-${index}`}
                      sx={{
                        minWidth: 200,
                        maxWidth: 200,
                        p: 2,
                        border: 1,
                        borderColor: alpha(rankColor, 0.3),
                        bgcolor: alpha(rankColor, 0.04),
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 16px ${alpha(rankColor, 0.15)}`,
                          borderColor: rankColor,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: rankColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 900 }}>
                          #{index + 1}
                        </Typography>
                      </Box>

                      <Avatar
                        src={getAvatarUrl(
                          user.avatar,
                          user.updated_at || user.updatedAt || user.created_at || user.createdAt
                        )}
                        alt={user.full_name || user.email}
                        sx={{
                          width: 60,
                          height: 60,
                          mx: 'auto',
                          mb: 1.5,
                          border: 2,
                          borderColor: rankColor,
                        }}
                      >
                        {(user.full_name || user.email || 'U')[0].toUpperCase()}
                      </Avatar>

                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.5,
                        }}
                      >
                        {user.full_name || 'N/A'}
                      </Typography>

                      {user.country && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                          <CountryBadge code={user.country} />
                        </Box>
                      )}

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={1}>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', textAlign: 'center', fontSize: '0.65rem' }}
                          >
                            Revenue
                          </Typography>
                          <Typography
                            variant="h6"
                            color="success.main"
                            sx={{ fontWeight: 800, textAlign: 'center', fontSize: '1rem' }}
                          >
                            {formatCurrencyCompact(revenue)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip
                            icon={<Iconify icon="solar:box-bold" width={12} />}
                            label={`${formatNumber(purchases)} pkgs`}
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Stack>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Grid>

        {/* ── All Users Breakdown ────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={2}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    All Users Purchase Breakdown
                  </Typography>
                  <Chip label={`${sortedUsers.length} Users`} size="small" color="default" />
                </Stack>
                <TableSortFilter
                  value={userSort}
                  onChange={setUserSort}
                  disabled={loading}
                  label="Sort Users"
                />
              </Stack>
            </Box>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      User
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Country
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Packages
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}
                    >
                      Revenue
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No user purchase data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((userRow, index) => {
                      const user = userRow.user || {};
                      const purchases = Number(userRow.purchases || 0);
                      const revenue = Number(userRow.revenue || 0);

                      return (
                        <TableRow
                          key={`all-user-${user.id}-${index}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index < 3 ? 'info' : 'default'}
                              variant={index < 3 ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar
                                src={getAvatarUrl(
                                  user.avatar,
                                  user.updated_at ||
                                    user.updatedAt ||
                                    user.created_at ||
                                    user.createdAt
                                )}
                                alt={user.full_name || user.email}
                                sx={{ width: 40, height: 40 }}
                              >
                                {(user.full_name || user.email || 'U')[0].toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {user.full_name || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.email || 'No email'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <CountryBadge code={user.country} />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatNumber(purchases)}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="subtitle2"
                              color="success.main"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatCurrency(revenue)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
