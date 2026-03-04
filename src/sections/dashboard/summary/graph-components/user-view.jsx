'use client';

import { Bar, Line } from 'react-chartjs-2';

import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Grid,
  Stack,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Divider,
  Typography,
  TableContainer,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import CountryBadge from 'src/components/chip/country-badge';

export default function UsersTab({
  loading,
  newUsersData,
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
  if (loading && !newUsersData) {
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
            <ChartSkeleton height={450} />
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <ChartSkeleton height={450} />
          </Grid>
        </Grid>
        <TableSkeleton />
        <Box sx={{ mt: 3 }}>
          <TableSkeleton />
        </Box>
      </>
    );
  }

  if (!newUsersData) {
    return (
      <EmptyState
        icon="solar:chart-2-bold-duotone"
        title="No Data Available"
        subtitle="Select a date range and apply filters to view new users analytics"
      />
    );
  }

  const byCountry = Array.isArray(newUsersData.by_country) ? newUsersData.by_country : [];
  const perDay = Array.isArray(newUsersData.per_day) ? newUsersData.per_day : [];
  const totalUsers = Number(newUsersData.total_users || 0);

  const topCountryCode = String(byCountry?.[0]?.country || '')
    .trim()
    .toUpperCase();
  const isUnknownTopCountry =
    !topCountryCode || ['UNKNOWN', 'N/A', 'NA', 'NULL'].includes(topCountryCode);

  const countryLabels = byCountry.map((c) => getCountryName(c.country));
  const countryValues = byCountry.map((c) => Number(c.count || 0));

  const dailyLabels = perDay.map((d) =>
    new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const dailyValues = perDay.map((d) => Number(d.count || 0));

  const palette = (count) => {
    const base = [
      chartColors.primary,
      chartColors.success,
      chartColors.info,
      chartColors.warning,
      chartColors.error,
      chartColors.secondary,
    ];
    return Array.from({ length: count }, (_, i) => {
      const c = base[i % base.length];
      const step = Math.floor(i / base.length);
      return alpha(c, Math.max(1 - step * 0.2, 0.4));
    });
  };

  const highestUserDay =
    perDay.length > 0
      ? perDay.reduce((max, cur) => (Number(cur.count) > Number(max.count) ? cur : max))
      : null;

  return (
    <>
     
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Total New Users"
            value={formatNumber(totalUsers)}
            icon="solar:users-group-rounded-bold"
            color="primary"
            subtitle={`${new Date(newUsersData.range.from).toLocaleDateString()} - ${new Date(newUsersData.range.to).toLocaleDateString()}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Countries"
            value={byCountry.length}
            icon="solar:global-bold"
            color="info"
            subtitle="Unique countries"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Top Country"
            value={getCountryName(byCountry[0]?.country || 'Unknown')}
            icon="solar:map-point-bold"
            color="warning"
            subtitle={`${formatNumber(byCountry[0]?.count || 0)} users`}
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
          icon={<Iconify icon="solar:user-bold" width={18} />}
          label="New User Analytics"
          color="success"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Daily Trend Chart ─────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ p: 3, height: 480 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Daily New Users Trend
              </Typography>
              <Chip
                label={`${perDay.length} Days`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Line
                data={{
                  labels: dailyLabels,
                  datasets: [
                    {
                      label: 'New Users',
                      data: dailyValues,
                      borderColor: chartColors.primary,
                      backgroundColor: alpha(chartColors.primary, 0.1),
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      pointBackgroundColor: chartColors.primary,
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                    },
                  ],
                }}
                options={lineChartOptions}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Daily Breakdown Table ─────────────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Daily User Breakdown
            </Typography>
          </Stack>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  New Users
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {perDay.map((row, index) => {
                const count = Number(row.count || 0);
                const formattedDate = new Date(row.day).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });
                const isPeakDay = highestUserDay && row.day === highestUserDay.day;

                return (
                  <TableRow
                    key={`${row.day}-${index}`}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      ...(isPeakDay && {
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.12) },
                      }),
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formattedDate}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: isPeakDay ? 'success.main' : 'text.primary',
                        }}
                      >
                        {count.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Divider sx={{ my: 5 }}>
        <Chip
          icon={<Iconify icon="solar:global-bold" width={18} />}
          label="Country Analytics"
          color="info"
          sx={{ fontSize: '0.875rem', fontWeight: 600, px: 2 }}
        />
      </Divider>

      {/* ── Country Bar Chart ─────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ p: 3, height: 480 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Users by Country (Top 10)
              </Typography>
              <Chip
                label={`${Math.min(10, byCountry.length)} Countries`}
                size="small"
                color="info"
                variant="outlined"
              />
            </Stack>
            <Box sx={{ height: 380 }}>
              <Bar
                data={{
                  labels: countryLabels.slice(0, 10),
                  datasets: [
                    {
                      label: 'Users',
                      data: countryValues.slice(0, 10),
                      backgroundColor: palette(10),
                      borderRadius: 8,
                      borderSkipped: false,
                      borderWidth: 0,
                    },
                  ],
                }}
                options={barChartOptions}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Country Table ─────────────────────────────────────────────────────── */}
      <Card>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Country Breakdown
            </Typography>
            <Chip label={`${byCountry.length} Total Countries`} size="small" color="info" />
          </Stack>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  Country
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'background.neutral' }}>
                  Users
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byCountry.map((row, index) => (
                <TableRow
                  key={`${row.country}-${index}`}
                  hover
                  sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Chip
                      label={`#${index + 1}`}
                      size="small"
                      color={index < 3 ? 'primary' : 'default'}
                      variant={index < 3 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CountryBadge code={row.country} />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Number(row.count || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
