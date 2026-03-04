'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { alpha } from '@mui/material/styles';
import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { getCookie, useDebounce } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function NotificationCategorySelector({
  onCategorySelect,
  label = 'Notification Category',
  placeholder = 'Search category type ',

  // API filters
  statusFilter = '',
  valueId = undefined,

  disabled = false,
  fullWidth = true,
  sx,
}) {
  const token = getCookie('session_key');

  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const seenIdsRef = useRef(new Set());
  const reqSeqRef = useRef(0);

  const debouncedTerm = useDebounce(inputValue, 300);

  const isSpecialOption = (opt) => opt?.optionType === 'loadMore' || opt?.optionType === 'end';

  const addFooterRows = (list, currentPage, newTotalPages, newTotalRecords) => {
    const clean = list.filter((o) => !isSpecialOption(o));
    if (currentPage < newTotalPages) {
      clean.push({ id: LOAD_MORE_KEY, optionType: 'loadMore' });
    } else {
      clean.push({ id: END_OF_LIST_KEY, optionType: 'end', total: newTotalRecords });
    }
    return clean;
  };

  const resetPaging = useCallback(() => {
    setOptions([]);
    setSelected((prev) => prev); // keep selected as-is
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }, []);

  const buildQuery = useCallback(
    (targetPage, term) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage || 1));
      params.set('limit', '50');

      const q = String(term || '').trim();
      if (q) params.set('q', q);

      const st = String(statusFilter || '').trim();
      if (st) params.set('status', st); // active|inactive

      return params.toString();
    },
    [statusFilter]
  );

  const fetchPage = useCallback(
    async (targetPage, term) => {
      const seq = ++reqSeqRef.current;

      try {
        setLoading(true);
        setErrorText('');

        const url = `${CONFIG.apiUrl}/v1/admin/notifications/categories?${buildQuery(
          targetPage,
          term
        )}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (seq !== reqSeqRef.current) return;

        if (!json?.success) throw new Error(json?.message || json?.msg || 'Request failed');

        const rows = json?.data?.categories || [];
        const pag = json?.data?.pagination || {};

        const newTotalPages = Number(pag.totalPages || 1);
        const newTotalRecords = Number(pag.totalItems || rows.length);

        const appended = [];
        for (const r of rows) {
          const id = Number(r?.id);
          if (id && !seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            appended.push({
              ...r,
              id,
            });
          }
        }

        setOptions((prev) => {
          const base = targetPage === 1 ? [] : prev.filter((o) => !isSpecialOption(o));
          const combined = [...base, ...appended];
          return addFooterRows(combined, targetPage, newTotalPages, newTotalRecords);
        });

        setPage(targetPage);
        setTotalPages(newTotalPages);
        setTotalRecords(newTotalRecords);
      } catch (e) {
        setErrorText(e?.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, token]
  );

  // reset & fetch when search/status changes
  useEffect(() => {
    resetPaging();
    fetchPage(1, debouncedTerm);
  }, [debouncedTerm, statusFilter, resetPaging, fetchPage]);

  // preselect by ID (BEST: add API /v1/admin/notifications/categories/:id)
  // If you don't have it, you can skip this block OR implement a small endpoint.
  useEffect(() => {
    if (valueId == null || valueId === '') return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        const res = await fetch(
          `${CONFIG.apiUrl}/v1/admin/notifications/categories/${Number(valueId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        if (cancelled) return;

        const cat = json?.data || json?.category || null;
        if (cat?.id) {
          const normalized = { ...cat, id: Number(cat.id) };
          setSelected(normalized);

          if (!seenIdsRef.current.has(normalized.id)) {
            seenIdsRef.current.add(normalized.id);
            setOptions((prev) => [normalized, ...prev]);
          }
        }
      } catch {
        // ignore (keep UI working)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [valueId, token]);

  const handleLoadMoreClick = (e) => {
    e?.preventDefault?.();
    if (!loading && page < totalPages) {
      fetchPage(page + 1, debouncedTerm);
    }
  };

  const getPrimaryText = (c) => String(c?.name || '').trim() || '—';
  const getSecondaryText = (c) => {
    const bits = [];
    if (c?.id) bits.push(`#${c.id}`);
    if (c?.status) bits.push(String(c.status).toUpperCase());
    if (c?.icon) bits.push(c.icon);
    return bits.join(' • ');
  };

  // icon: you store icon name/string (like mdi:bell)
  // We'll render it as a simple Avatar letter fallback (or you can use Iconify if you want).
  const getAvatarLetter = (c) => (getPrimaryText(c)?.[0] || 'N').toUpperCase();

  return (
    <Autocomplete
      sx={sx}
      fullWidth={fullWidth}
      disabled={disabled}
      loading={loading}
      options={options}
      value={selected}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      getOptionLabel={(opt) => {
        if (!opt) return '';
        if (opt.id === LOAD_MORE_KEY || opt.id === END_OF_LIST_KEY) return '';
        return getPrimaryText(opt);
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          try {
            onCategorySelect && onCategorySelect('', null);
          } catch {
            /* ignore */
          }
          return;
        }

        if (!newVal) {
          setSelected(null);
          return;
        }

        if (newVal?.id === LOAD_MORE_KEY) {
          handleLoadMoreClick();
          return;
        }

        if (newVal?.id === END_OF_LIST_KEY) return;

        setSelected(newVal);
        try {
          onCategorySelect && onCategorySelect(newVal.id, newVal);
        } catch {
          /* ignore */
        }
      }}
      onInputChange={(_, newInput, reason) => {
        if (reason === 'input' || reason === 'clear') setInputValue(newInput);
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: selected?.icon ? (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                  }}
                >
                  <Iconify icon={selected.icon} width={18} />
                </Avatar>
              </Box>
            ) : (
              params.InputProps.startAdornment
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          helperText={errorText || ''}
          error={Boolean(errorText)}
        />
      )}
      renderOption={(props, option) => {
        if (option?.optionType === 'loadMore') {
          return (
            <li
              {...props}
              key={LOAD_MORE_KEY}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLoadMoreClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLoadMoreClick(e);
                }
              }}
              style={{ cursor: loading ? 'default' : 'pointer' }}
            >
              <Box sx={{ py: 1, width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                {loading ? <CircularProgress size={16} /> : null}
                <Typography variant="body2">{loading ? 'Loading…' : 'Load more…'}</Typography>
              </Box>
            </li>
          );
        }

        if (option?.optionType === 'end') {
          return (
            <li
              {...props}
              key={END_OF_LIST_KEY}
              aria-disabled
              onMouseDown={(e) => e.preventDefault()}
            >
              <Box sx={{ py: 1, width: '100%', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  — End of list ({option?.total ?? 0} items loaded) —
                </Typography>
              </Box>
            </li>
          );
        }

        return (
          <li {...props} key={option.id}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              >
                <Iconify icon={option?.icon || 'mdi:tag'} width={22} />
              </Avatar>

              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {getPrimaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {getSecondaryText(option)}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}

