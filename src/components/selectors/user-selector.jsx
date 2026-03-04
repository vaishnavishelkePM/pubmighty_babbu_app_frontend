'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { getCookie, useDebounce } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function UserSelector({
  onUserSelect, // (id: number|string, user: any|null) => void
  label = 'Select user',
  placeholder = 'Type username OR user id…',

  // API filters (same as getUsers controller)
  statusFilter = null, // 0|1|2|3|null
  isActive = null, // true|false|null
  isVerified = null, // true|false|null
  includeDeleted = false, // boolean
  country = '',
  gender = '',
  registerType = '',
  email = '',
  phone = '',
  fullName = '',

  // optional: preselect by user id (tries /users/:id if you have it)
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

  const isNumericId = (v) => /^\d+$/.test(String(v || '').trim());

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
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setErrorText('');
    seenIdsRef.current = new Set();
  }, []);

  //  Build query for your getUsers API
  // IMPORTANT:
  // - If term is numeric => try "id" search (you MUST support id in backend to really filter)
  // - Else use "username" prefix search
  const buildQuery = useCallback(
    (targetPage, term) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage || 1));
      params.set('sortBy', 'created_at');
      params.set('sortOrder', 'DESC');

      const t = String(term || '').trim();

      if (t) {
        if (isNumericId(t)) {
          //  search by ID (requires backend to accept "id" param and filter by it)
          params.set('id', t);
        } else {
          //  search by username prefix (already supported)
          params.set('full_name', t);
        }
      }

      if (statusFilter !== null && statusFilter !== undefined && statusFilter !== '') {
        params.set('status', String(statusFilter));
      }
      if (isActive !== null && isActive !== undefined && isActive !== '') {
        params.set('is_active', String(isActive));
      }
      if (isVerified !== null && isVerified !== undefined && isVerified !== '') {
        params.set('is_verified', String(isVerified));
      }

      params.set('include_deleted', includeDeleted ? 'true' : 'false');

      if (email && String(email).trim()) params.set('email', String(email).trim());
      if (phone && String(phone).trim()) params.set('phone', String(phone).trim());
      if (fullName && String(fullName).trim()) params.set('full_name', String(fullName).trim());
      if (country && String(country).trim()) params.set('country', String(country).trim());
      if (gender && String(gender).trim()) params.set('gender', String(gender).trim());
      if (registerType && String(registerType).trim())
        params.set('register_type', String(registerType).trim());

      return params.toString();
    },
    [
      statusFilter,
      isActive,
      isVerified,
      includeDeleted,
      country,
      gender,
      registerType,
      email,
      phone,
      fullName,
    ]
  );

  const fetchPage = useCallback(
    async (targetPage, term) => {
      const seq = ++reqSeqRef.current;

      try {
        setLoading(true);
        setErrorText('');

        const url = `${CONFIG.apiUrl}/v1/admin/users?${buildQuery(targetPage, term)}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (seq !== reqSeqRef.current) return;
        if (!json?.success) throw new Error(json?.msg || 'Request failed');

        const rows = json?.data?.items || [];
        const pag = json?.data?.pagination || {};

        const newTotalPages = Number(pag.totalPages || 1);
        const newTotalRecords = Number(pag.totalItems || rows.length);

        const appended = [];
        for (const r of rows) {
          if (r?.id && !seenIdsRef.current.has(r.id)) {
            seenIdsRef.current.add(r.id);
            appended.push(r);
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

  //  reset & fetch when search / filters change
  useEffect(() => {
    resetPaging();
    fetchPage(1, debouncedTerm);
  }, [debouncedTerm, resetPaging, fetchPage]);

  //  preselect by ID (only works if /v1/admin/users/:id exists)
  useEffect(() => {
    if (valueId == null) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        const res = await fetch(`${CONFIG.apiUrl}/v1/admin/users/${valueId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Not found');
        const json = await res.json();
        if (cancelled) return;

        const u = json?.data || json?.user || null;
        if (u?.id) {
          setSelected(u);
          if (!seenIdsRef.current.has(u.id)) {
            seenIdsRef.current.add(u.id);
            setOptions((prev) => [u, ...prev]);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // eslint-disable-next-line consistent-return
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

  const getOptionPrimaryText = (u) => {
    const full = String(u?.full_name || '').trim();
    return full || u?.full_name || '';
  };

  const getOptionSecondaryText = (u) => {
    const bits = [];
    if (u?.id) bits.push(`#${u.id}`); //  show id so you can confirm
    if (u?.full_name) bits.push(`@${u.full_name}`);
    if (u?.country) bits.push(u.country);
    return bits.join(' • ');
  };

  const getUserAvatar = (u) => {
    const av = u?.avatar || u?.profile_image || u?.profileImage || '';
    if (!av) return '';
    if (String(av).startsWith('http')) return av;

    let path = String(av);
    if (!path.startsWith('uploads/')) path = `uploads/avatar/user/${path}`;
    return `${CONFIG.assetsUrl}/${path}`;
  };

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
        // show username/full name in input after select
        return getOptionPrimaryText(opt);
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          try {
            onUserSelect && onUserSelect('', null);
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
          onUserSelect && onUserSelect(newVal.id, newVal);
        } catch {
          /* ignore */
        }
      }}
      onInputChange={(_, newInput, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(newInput);
        }
      }}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
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
                gridTemplateColumns: '40px 1fr',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Avatar
                src={getUserAvatar(option)}
                alt={getOptionPrimaryText(option)}
                sx={{ width: 40, height: 50, borderRadius: 1 }}
              />
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {getOptionPrimaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {getOptionSecondaryText(option)}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                  {option?.email || option?.phone || '—'}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}
