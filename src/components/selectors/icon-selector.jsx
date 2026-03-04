'use client';

import axios from 'axios';
import { useRef, useMemo, useState, useEffect } from 'react';

import { alpha } from '@mui/material/styles';
import {
  Box,
  Chip,
  Avatar,
  TextField,
  Typography,
  Autocomplete,
  FormHelperText,
  CircularProgress,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';


const ICONIFY_API = 'https://api.iconify.design';

function normalizeIconValue(v) {
  return String(v || '').trim();
}

function iconLabelFromValue(icon) {
  const s = String(icon || '');
  if (!s) return '';
  // "mdi:heart" -> "heart"
  const parts = s.split(':');
  return parts.length === 2 ? parts[1] : s;
}

export default function IconSelector({
  value = '',
  onSelect,
  label = 'Icon',
  placeholder = 'Search icons... (e.g. heart, bell, chat)',
  fullWidth = true,
  disabled = false,
  error = null,

  // Optional: restrict to some popular sets for cleaner results
  // You can change this anytime.
  prefixes = 'mdi,material-symbols,ic,solar,tabler,ph,heroicons,bi,fa-solid,fa-regular',
  limit = 64,
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(iconLabelFromValue(value));
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const reqIdRef = useRef(0);
  const debounceRef = useRef(null);

  const selectedOption = useMemo(() => {
    const v = normalizeIconValue(value);
    if (!v) return null;
    return { value: v, label: v, icon: v };
  }, [value]);

  const defaultSuggestions = useMemo(
    () => [
      { icon: 'mdi:bell', label: 'mdi:bell', value: 'mdi:bell' },
      { icon: 'mdi:heart', label: 'mdi:heart', value: 'mdi:heart' },
      { icon: 'mdi:chat', label: 'mdi:chat', value: 'mdi:chat' },
      { icon: 'mdi:account', label: 'mdi:account', value: 'mdi:account' },
      { icon: 'mdi:tag', label: 'mdi:tag', value: 'mdi:tag' },
      { icon: 'mdi:shield-check', label: 'mdi:shield-check', value: 'mdi:shield-check' },
      { icon: 'mdi:alert', label: 'mdi:alert', value: 'mdi:alert' },
      { icon: 'mdi:gift', label: 'mdi:gift', value: 'mdi:gift' },
      { icon: 'mdi:information', label: 'mdi:information', value: 'mdi:information' },
      { icon: 'mdi:email', label: 'mdi:email', value: 'mdi:email' },
    ],
    []
  );

  const fetchIcons = async (q) => {
    const query = String(q || '').trim();
    if (!query) {
      setOptions(defaultSuggestions);
      return;
    }

    // Debounce + drop stale requests
    const myReqId = ++reqIdRef.current;
    setLoading(true);

    try {
      const url =
        `${ICONIFY_API}/search` +
        `?query=${encodeURIComponent(query)}` +
        `&limit=${Math.min(Math.max(Number(limit) || 64, 32), 999)}` +
        `&prefixes=${encodeURIComponent(prefixes)}`;

      const res = await axios.get(url, { validateStatus: () => true });

      // If a newer request started, ignore this one
      if (myReqId !== reqIdRef.current) return;

      const data = res.data || {};
      const icons = Array.isArray(data.icons) ? data.icons : [];

      const mapped = icons.slice(0, limit).map((name) => ({
        icon: name,
        value: name,
        label: name,
      }));

      // If nothing found, still allow user to type freely
      setOptions(mapped.length ? mapped : []);
    } catch (e) {
      // silent fail -> keep existing options
      if (myReqId === reqIdRef.current) setOptions([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    // When dropdown opens, show defaults first
    setOptions(defaultSuggestions);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Debounce typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchIcons(inputValue);
    }, 250);

    // eslint-disable-next-line consistent-return
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, open]);

  return (
    <>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        disabled={disabled}
        fullWidth={fullWidth}
        options={options}
        value={selectedOption}
        inputValue={inputValue}
        onInputChange={(_, newInput) => setInputValue(newInput)}
        onChange={(_, newValue) => {
          // newValue can be string (freeSolo) OR option object
          const picked =
            typeof newValue === 'string'
              ? newValue
              : newValue && typeof newValue === 'object'
                ? newValue.value
                : '';

          const finalValue = normalizeIconValue(picked);

          onSelect(finalValue);

          // keep input readable
          setInputValue(iconLabelFromValue(finalValue));
        }}
        freeSolo
        clearOnEscape
        loading={loading}
        filterOptions={(x) => x} // don't re-filter client-side (server already searched)
        noOptionsText={loading ? 'Searching...' : 'No icons found'}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;

          return (
            <Box
              key={key}
              component="li"
              {...otherProps}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              >
                <Iconify icon={option.icon || 'mdi:tag'} width={18} />
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {option.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {iconLabelFromValue(option.value)}
                </Typography>
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={Boolean(error)}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      {error && <FormHelperText error>{error}</FormHelperText>}
    </>
  );
}
