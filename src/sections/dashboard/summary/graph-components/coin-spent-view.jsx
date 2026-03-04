'use client';

import { useMemo } from 'react';
import { Pie, Line } from 'react-chartjs-2';

import { alpha } from '@mui/material/styles';
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

import { getAvatarUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import CountryBadge from 'src/components/chip/country-badge';


export default function CoinSpendTab({
  loading,
  coinSpendData,
  chartColors,
  barChartOptions,
  lineChartOptions,
  getCountryName,
  formatNumber,
  KpiCard,
  ChartSkeleton,
  TableSkeleton,
  EmptyState,
  theme,
}) {
  // ─── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !coinSpendData) {
    return (
      <>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <KpiCard loading />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <ChartSkeleton height={480} />
          </Grid>
        </Grid>
        <Card>
          <TableSkeleton rows={8} cols={5} includeHeader dense={false} rounded />
        </Card>
      </>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (!coinSpendData) {
    return (
      <EmptyState
        icon="solar:coin-bold-duotone"
        title="No Coin Spend Data"
        subtitle="Select a date range and apply filters to view coin spend analytics"
      />
    );
  }

  const perDayTotal = Array.isArray(coinSpendData.per_day_total) ? coinSpendData.per_day_total : [];
  const perDayMsgCoins = Array.isArray(coinSpendData.per_day_total_msg)
    ? coinSpendData.per_day_total_msg
    : [];
  const perDayCallCoins = Array.isArray(coinSpendData.per_day_total_call)
    ? coinSpendData.per_day_total_call
    : [];

  const countryWiseCoinSpent = Array.isArray(coinSpendData.country_wise_coin_spent)
    ? coinSpendData.country_wise_coin_spent
    : [];

  const countryWiseMessageCoinSpent = Array.isArray(coinSpendData.country_wise_message_coin_spent)
    ? coinSpendData.country_wise_message_coin_spent
    : [];
  const topUsersMessage = Array.isArray(coinSpendData.users_message_coin_spent)
    ? coinSpendData.users_message_coin_spent
    : [];

  const topUsersVideoCall = Array.isArray(coinSpendData.users_video_call_coin_spent)
    ? coinSpendData.users_video_call_coin_spent
    : [];

  const countryWiseVideoCallCoinSpent = Array.isArray(
    coinSpendData.country_wise_video_call_coin_spent
  )
    ? coinSpendData.country_wise_video_call_coin_spent
    : [];

  const topCountries = Array.isArray(coinSpendData.top_countries)
    ? coinSpendData.top_countries
    : [];

  // ─── Normalise per-day data ───────────────────────────────────────────────────
  // Old backend used .day; new endpoints return .date — support both
  const normDay = (item) => String(item.date || item.day || '');
  const getCoins = (row) => Number(row?.total ?? row?.coins ?? 0);

  // Map day → count/total for chart building
  const msgCoinsMap = new Map(perDayMsgCoins.map((d) => [normDay(d), Number(d.total || 0)]));
  const callCoinsMap = new Map(perDayCallCoins.map((d) => [normDay(d), Number(d.total || 0)]));

  // Build unified day list from perDayTotal (which has the SUM of coins)
  const days = [
    ...new Set([
      ...perDayTotal.map(normDay),
      ...perDayMsgCoins.map(normDay),
      ...perDayCallCoins.map(normDay),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  const labels = days.map((day) =>
    new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  const msgCoinValues = days.map((day) => msgCoinsMap.get(day) || 0);
  const callCoinValues = days.map((day) => callCoinsMap.get(day) || 0);

  // total from perDayTotal
  const perDayTotalMap = new Map(perDayTotal.map((d) => [normDay(d), Number(d.total || 0)]));
  const totalValues = days.map((day) => perDayTotalMap.get(day) || 0);

  // ─── KPI Totals ───────────────────────────────────────────────────────────────
  const totalSpent = Number(coinSpendData.total_coins_spent || 0);
  const totalMsgCoins = perDayMsgCoins.reduce((sum, d) => sum + Number(d.total || 0), 0);
  const totalCallCoins = perDayCallCoins.reduce((sum, d) => sum + Number(d.total || 0), 0);

  // top country — top_countries has { country, user_count }
  const topCountryCode = String(topCountries?.[0]?.country || '')
    .trim()
    .toUpperCase();
  const isUnknownTopCountry =
    !topCountryCode || ['UNKNOWN', 'N/A', 'NA', 'NULL'].includes(topCountryCode);

  // ─── Chart data ───────────────────────────────────────────────────────────────
  const combinedLineData = {
    labels,
    datasets: [
      {
        label: 'Total Coins',
        data: totalValues,
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
      {
        label: 'Messages',
        data: msgCoinValues,
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
      {
        label: 'Video Calls',
        data: callCoinValues,
        borderColor: chartColors.warning,
        backgroundColor: alpha(chartColors.warning, 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: chartColors.warning,
        pointBorderColor: theme.palette.background.paper,
        pointBorderWidth: 2,
      },
    ],
  };

  // ─── Colour palette helper ────────────────────────────────────────────────────
  const palette = (count) => {
    const base = [
      chartColors.warning,
      chartColors.primary,
      chartColors.success,
      chartColors.info,
      chartColors.error,
      chartColors.secondary,
    ];
    return Array.from({ length: count }, (_, i) => {
      const c = base[i % base.length];
      const step = Math.floor(i / base.length);
      return alpha(c, Math.max(1 - step * 0.2, 0.4));
    });
  };

  // ─── Pie chart options ────────────────────────────────────────────────────────
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
            const value = formatNumber(context.parsed);
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  // ─── Top-5 horizontal slider helpers ─────────────────────────────────────────
  const top5MessageUsers = useMemo(() => topUsersMessage.slice(0, 5), [topUsersMessage]);
  const top5VideoUsers = useMemo(() => topUsersVideoCall.slice(0, 5), [topUsersVideoCall]);

  const getRankColor = (index, fallbackColor) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', theme.palette.primary.main, fallbackColor];
    return colors[index] || theme.palette.grey[500];
  };
  //horizontal users
  const HorizontalUserSlider = ({
    title,
    users,
    accentColor,
    statLabel,
    getStatValue,
    getSubStatValue,
    getUserObj,
  }) => (
    <Grid item xs={12}>
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Stack>

        {users.length === 0 ? (
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
            {users.map((row, index) => {
              const user = getUserObj(row);
              const rankColor = getRankColor(index, accentColor);

              return (
                <Card
                  key={`top5-${title}-${user.id || index}-${index}`}
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
                    src={getAvatarUrl(user.avatar, user.updated_at || user.updatedAt)}
                    alt={user.name || user.email}
                    sx={{
                      width: 60,
                      height: 60,
                      mx: 'auto',
                      mb: 1.5,
                      border: 2,
                      borderColor: rankColor,
                    }}
                  >
                    {(user.name || user.email || 'U')[0]?.toUpperCase?.() || 'U'}
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
                    {user.name || 'N/A'}
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
                        {statLabel}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: accentColor,
                        }}
                      >
                        {getStatValue(row)}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Grid>
  );

  // ─── Reusable pie builder ─────────────────────────────────────────────────────
  const buildPieData = (items, getValue, getLabel) => {
    const top10 = items.slice(0, 10);
    if (!top10.length) {
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
    return {
      labels: top10.map((c) => getCountryName(getLabel(c))),
      datasets: [
        {
          data: top10.map((c) => Number(getValue(c) || 0)),
          backgroundColor: top10.map((_, i) => palette(10)[i]),
          borderColor: top10.map(() => theme.palette.background.paper),
          borderWidth: 2,
        },
      ],
    };
  };

  return (
    <>
      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Total Coins Spent"
            value={formatNumber(totalSpent)}
            icon="solar:wallet-money-bold"
            color="warning"
            subtitle="All activities"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Messages"
            value={formatNumber(totalMsgCoins)}
            icon="solar:chat-round-bold"
            color="success"
            subtitle="Total coins spent on messeges"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Video Calls"
            value={formatNumber(totalCallCoins)}
            icon="solar:videocamera-bold"
            color="error"
            subtitle="Total coins spent on video calls"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Top Country"
            value={getCountryName(topCountryCode || 'Unknown')}
            icon="solar:map-point-bold"
            color="info"
            subtitle={`${formatNumber(topCountries?.[0]?.user_count || 0)} users`}
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

      {/* ── Overall Activity Trend ────────────────────────────────────────────── */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Coin Spend Trend by Activity Type
          </Typography>
          <Chip
            icon={<Iconify icon="solar:coin-bold" width={16} />}
            label={`${formatNumber(totalSpent)} Total`}
            color="warning"
            size="small"
          />
        </Stack>
        <Box sx={{ height: 360 }}>
          <Line data={combinedLineData} options={lineChartOptions} />
        </Box>
      </Card>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:global-bold" width={18} />}
          label="Overall Country Analytics"
          color="info"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Top Countries Pie + Table ──────────────────────────────────────────── */}
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
                Top 10 Countries (by User Count)
              </Typography>
              <Chip
                icon={<Iconify icon="solar:global-bold" width={14} />}
                label={`${Math.min(countryWiseCoinSpent.length, 10)}`}
                size="small"
                color="info"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Pie
                data={buildPieData(
                  countryWiseCoinSpent,
                  (c) => c.total,
                  (c) => c.country
                )}
                options={pieChartOptions}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Country-wise Breakdown
                </Typography>
                <Chip
                  label={`${countryWiseCoinSpent.length} Countries`}
                  size="small"
                  color="info"
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
                      coin spent
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {countryWiseCoinSpent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
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
                    countryWiseCoinSpent.map((row, index) => (
                      <TableRow
                        key={`${row.country}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Chip
                            label={`${index + 1}`}
                            size="small"
                            color={index < 3 ? 'info' : 'default'}
                            variant={index < 3 ? 'filled' : 'outlined'}
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
                            color="info.main"
                            sx={{ fontWeight: 700 }}
                          >
                            {formatNumber(Number(row.total || 0))}
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
          icon={<Iconify icon="solar:chat-round-bold" width={18} />}
          label="Message Analytics"
          color="success"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Message Users Section ─────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top 5 Message Users */}
        <HorizontalUserSlider
          title="Top 5 Users by Message Coin Spent"
          users={top5MessageUsers}
          accentColor={theme.palette.success.main}
          statLabel="Coins Spent"
          getUserObj={(row) => row.user || {}}
          getStatValue={(row) => formatNumber(Number(row.coins_spent || 0))}
          getSubStatValue={(row) => `${formatNumber(Number(row.transactions || 0))} tx`}
        />

        {/* All Message Users table (Coin Spent) */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  All Users by Message Coin Spent
                </Typography>
                <Chip label={`${topUsersMessage.length} Users`} size="small" color="success" />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Rank
                    </TableCell>
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
                      Coins Spent
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {topUsersMessage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No message user data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    topUsersMessage.map((row, index) => {
                      const user = row.user || {};
                      return (
                        <TableRow
                          key={`msg-user-coins-${row.user_id || user.id || index}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index === 0 ? 'warning' : index < 3 ? 'success' : 'default'}
                              variant={index < 3 ? 'filled' : 'outlined'}
                            />
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar
                                src={getAvatarUrl(user.avatar, user.updated_at || user.updatedAt)}
                                alt={user.full_name || user.name || user.email}
                                sx={{ width: 40, height: 40 }}
                              >
                                {(user.full_name ||
                                  user.name ||
                                  user.email ||
                                  'U')[0]?.toUpperCase?.() || 'U'}
                              </Avatar>

                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {user.full_name || user.name || 'N/A'}
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
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, color: 'success.main' }}
                            >
                              {formatNumber(Number(row.coins_spent || 0))}
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

        {/* Message Country Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: 460 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Top 10 Countries (Messages)
              </Typography>
              <Chip
                icon={<Iconify icon="solar:chat-round-bold" width={14} />}
                label={`${Math.min(countryWiseMessageCoinSpent.length, 10)}`}
                size="small"
                color="success"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Pie
                data={buildPieData(
                  countryWiseMessageCoinSpent,
                  (c) => c.coins_spent,
                  (c) => c.country
                )}
                options={pieChartOptions}
              />
            </Box>
          </Card>
        </Grid>

        {/* Message Country Table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Country-wise Message Breakdown
                </Typography>
                <Chip
                  label={`${countryWiseMessageCoinSpent.length} Countries`}
                  size="small"
                  color="success"
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
                      coins spent
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {countryWiseMessageCoinSpent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No message country data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    countryWiseMessageCoinSpent.map((row, index) => (
                      <TableRow
                        key={`msg-country-${row.country}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Chip
                            label={`${index + 1}`}
                            size="small"
                            color={index < 3 ? 'success' : 'default'}
                            variant={index < 3 ? 'filled' : 'outlined'}
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
                            {formatNumber(Number(row.coins_spent || 0))}
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

        {/* Message Daily Breakdown */}
        {/* Message Daily Breakdown */}
        <Grid item xs={12}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Daily Message Coin Spent
                </Typography>
                <Chip label={`${formatNumber(totalMsgCoins)} Total`} size="small" color="success" />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 390 }}>
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
                      Coins Spent
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {perDayMsgCoins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No message coin data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...perDayMsgCoins]
                      .sort((a, b) => new Date(normDay(b)) - new Date(normDay(a)))
                      .map((row, index) => (
                        <TableRow
                          key={`msg-${normDay(row)}-${index}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(normDay(row)).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, color: 'success.main' }}
                            >
                              {formatNumber(getCoins(row))}
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
          icon={<Iconify icon="solar:videocamera-bold" width={18} />}
          label="Video Call Analytics"
          color="error"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Video Call Users Section ─────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top 5 Video Call Users */}
        <HorizontalUserSlider
          title="Top 5 Users by Call Coin Spent"
          users={top5VideoUsers}
          accentColor={theme.palette.error.main}
          statLabel="Coins Spent"
          getUserObj={(row) => row.user || {}}
          getStatValue={(row) => formatNumber(Number(row.coins_spent || 0))}
          getSubStatValue={(row) => `${formatNumber(Number(row.transactions || 0))} tx`}
        />

        {/* All Video Call Users table (Coin Spent) */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  All Users by Video Call Coin Spent
                </Typography>
                <Chip label={`${topUsersVideoCall.length} Users`} size="small" color="error" />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                      Rank
                    </TableCell>
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
                      Coins Spent
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {topUsersVideoCall.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No video call user data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    topUsersVideoCall.map((row, index) => {
                      const user = row.user || {};
                      return (
                        <TableRow
                          key={`call-user-coins-${row.user_id || user.id || index}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color={index === 0 ? 'warning' : index < 3 ? 'error' : 'default'}
                              variant={index < 3 ? 'filled' : 'outlined'}
                            />
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar
                                src={getAvatarUrl(user.avatar, user.updated_at || user.updatedAt)}
                                alt={user.full_name || user.name || user.email}
                                sx={{ width: 40, height: 40 }}
                              >
                                {(user.full_name ||
                                  user.name ||
                                  user.email ||
                                  'U')[0]?.toUpperCase?.() || 'U'}
                              </Avatar>

                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {user.full_name || user.name || 'N/A'}
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
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, color: 'error.main' }}
                            >
                              {formatNumber(Number(row.coins_spent || 0))}
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

        {/* Video Call Country Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: 460 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Top 10 Countries (Video Calls)
              </Typography>
              <Chip
                icon={<Iconify icon="solar:videocamera-bold" width={14} />}
                label={`${Math.min(countryWiseVideoCallCoinSpent.length, 10)}`}
                size="small"
                color="error"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Pie
                data={buildPieData(
                  countryWiseVideoCallCoinSpent,
                  (c) => c.coins_spent,
                  (c) => c.country
                )}
                options={pieChartOptions}
              />
            </Box>
          </Card>
        </Grid>

        {/* Video Call Country Table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Country-wise Video Call Breakdown
                </Typography>
                <Chip
                  label={`${countryWiseVideoCallCoinSpent.length} Countries`}
                  size="small"
                  color="error"
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
                      coins spent
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {countryWiseVideoCallCoinSpent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No video call country data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    countryWiseVideoCallCoinSpent.map((row, index) => (
                      <TableRow
                        key={`video-country-${row.country}-${index}`}
                        hover
                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Chip
                            label={`${index + 1}`}
                            size="small"
                            color={index < 3 ? 'error' : 'default'}
                            variant={index < 3 ? 'filled' : 'outlined'}
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
                            color="error.main"
                            sx={{ fontWeight: 700 }}
                          >
                            {formatNumber(Number(row.coins_spent || 0))}
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

        {/* Video Call Daily Breakdown */}

        <Grid item xs={12}>
          <Card sx={{ height: 460 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Daily Video Call Coin Spent
                </Typography>
                <Chip label={`${formatNumber(totalCallCoins)} Total`} size="small" color="error" />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 390 }}>
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
                      Coins Spent
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {perDayCallCoins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 3, textAlign: 'center' }}
                        >
                          No video call coin data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...perDayCallCoins]
                      .sort((a, b) => new Date(normDay(b)) - new Date(normDay(a)))
                      .map((row, index) => (
                        <TableRow
                          key={`video-${normDay(row)}-${index}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(normDay(row)).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, color: 'error.main' }}
                            >
                              {formatNumber(getCoins(row))}
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
    </>
  );
}
