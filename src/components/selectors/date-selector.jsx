import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useRef, useState, useEffect } from 'react';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Select,
  Button,
  Popover,
  MenuItem,
  TextField,
  InputLabel,
  FormControl,
} from '@mui/material';

dayjs.extend(utc);

const formatForMySQL = (date) => (date ? dayjs(date).utc().format('YYYY-MM-DD HH:mm:ss') : null);

const calculateDateRange = (timePeriod) => {
  let endDate = dayjs().endOf('day');
  let startDate;

  switch (timePeriod) {
    case 'today':
      startDate = dayjs().startOf('day');
      break;
    case 'yesterday':
      startDate = dayjs().subtract(1, 'day').startOf('day');
      endDate = dayjs().subtract(1, 'day').endOf('day');
      break;
    case '7days':
      startDate = dayjs().subtract(6, 'day').startOf('day');
      break;
    case '1month':
      startDate = dayjs().subtract(1, 'month').startOf('day');
      break;
    case '3months':
      startDate = dayjs().subtract(3, 'month').startOf('day');
      break;
    case '6months':
      startDate = dayjs().subtract(6, 'month').startOf('day');
      break;
    case '1year':
      startDate = dayjs().subtract(1, 'year').startOf('day');
      break;
    case 'currentMonth':
      startDate = dayjs().startOf('month');
      endDate = dayjs().endOf('month');
      break;
    default:
      startDate = null;
      endDate = null;
  }

  return { startDate, endDate };
};

export default function DateRangeSelector({
  label = 'Time Period',
  setFilters,
  setDateRange,
  period = '',
  resetFilters = null,
  defaultDateRange = { startDate: null, endDate: null },
}) {
  const selectRef = useRef(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [anchorEl, setAnchorEl] = useState(null);

  const [customStart, setCustomStart] = useState(defaultDateRange.startDate);
  const [customEnd, setCustomEnd] = useState(defaultDateRange.endDate);

  useEffect(() => {
    if (period === 'custom') {
      setCustomStart(defaultDateRange.startDate);
      setCustomEnd(defaultDateRange.endDate);
      const start = formatForMySQL(defaultDateRange.startDate);
      const end = formatForMySQL(defaultDateRange.endDate);
      setFilters?.((prev) => ({ ...prev, timePeriod: 'custom', startDate: start, endDate: end }));
      setDateRange?.(start, end);
    } else {
      const { startDate, endDate } = calculateDateRange(period);
      const start = formatForMySQL(startDate);
      const end = formatForMySQL(endDate);
      setFilters?.((prev) => ({ ...prev, timePeriod: period, startDate: start, endDate: end }));
      setDateRange?.(start, end);
    }
    setSelectedPeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleTimePeriodChange = (event) => {
    const newPeriod = event.target.value;

    setSelectedPeriod(newPeriod);

    if (newPeriod === 'custom') {
      setAnchorEl(selectRef.current);
    } else {
      const { startDate, endDate } = calculateDateRange(newPeriod);
      const start = formatForMySQL(startDate);
      const end = formatForMySQL(endDate);
      setFilters?.((prev) => ({ ...prev, timePeriod: newPeriod, startDate: start, endDate: end }));
      setDateRange?.(start, end);
      setAnchorEl(null);
    }
  };

  // Trigger popover manually when clicking "custom" again
  const handleSelectClick = () => {
    if (selectedPeriod === 'custom') {
      setAnchorEl(null); // Close first
      setTimeout(() => {
        setAnchorEl(selectRef.current); // Reopen after small delay
      }, 0);
    }
  };

  const handleDateChange = (field, newValue) => {
    if (field === 'startDate') {
      setCustomStart(newValue);
    } else {
      setCustomEnd(newValue);
    }
  };

  const handleFilterApply = () => {
    const start = formatForMySQL(customStart);
    const end = formatForMySQL(customEnd);

    setFilters?.((prev) => ({
      ...prev,
      timePeriod: 'custom',
      startDate: start,
      endDate: end,
    }));
    setDateRange?.(start, end);
    setAnchorEl(null);
  };

  const handleReset = () => {
    setSelectedPeriod('');
    setCustomStart(null);
    setCustomEnd(null);
    setFilters?.((prev) => ({
      ...prev,
      timePeriod: '',
      startDate: null,
      endDate: null,
    }));
    setDateRange?.(null, null);
    setAnchorEl(null);
  };

  useEffect(() => {
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFilters]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          ref={selectRef}
          value={selectedPeriod}
          onChange={handleTimePeriodChange}
          onClick={handleSelectClick}
          label={label}
        >
          <MenuItem value="today">Today</MenuItem>
          <MenuItem value="yesterday">Yesterday</MenuItem>
          <MenuItem value="7days">Last 7 Days</MenuItem>
          <MenuItem value="1month">Last 1 Month</MenuItem>
          <MenuItem value="3months">Last 3 Months</MenuItem>
          <MenuItem value="6months">Last 6 Months</MenuItem>
          <MenuItem value="1year">Last 1 Year</MenuItem>
          <MenuItem value="currentMonth">Current Month</MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>
      </FormControl>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ m: 1, width: 250 }}>
          <DatePicker
            label="Start Date"
            value={customStart}
            onChange={(newDate) => handleDateChange('startDate', newDate)}
            renderInput={(params) => <TextField fullWidth {...params} />}
          />
        </Box>
        <Box sx={{ m: 1, width: 250 }}>
          <DatePicker
            label="End Date"
            value={customEnd}
            onChange={(newDate) => handleDateChange('endDate', newDate)}
            renderInput={(params) => <TextField fullWidth {...params} />}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 1,
            p: 1,
          }}
        >
          <Button variant="outlined" onClick={() => setAnchorEl(null)} sx={{ width: '100%' }}>
            Close
          </Button>
          <Button variant="contained" onClick={handleFilterApply} sx={{ width: '100%' }}>
            Apply
          </Button>
        </Box>
      </Popover>
    </LocalizationProvider>
  );
}
