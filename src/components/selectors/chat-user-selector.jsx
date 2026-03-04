'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import { Box, Avatar, TextField, Typography, Autocomplete, CircularProgress } from '@mui/material';

import { getCookie, useDebounce } from 'src/utils/helper';
import { CONFIG } from 'src/global-config';

const LOAD_MORE_KEY = '__LOAD_MORE__';
const END_OF_LIST_KEY = '__END_OF_LIST__';

export default function ChatUserSelector({
  receiverId, // IMPORTANT: receiver user id (whose chats to load)
  onSelect, // (payload|null) => void
  label = 'Select chat user',
  placeholder = 'Search by user id or full name…',
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

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Deduplicate by "other user id" so list doesn't repeat
  const seenUserIdsRef = useRef(new Set());
  const reqSeqRef = useRef(0);

  const debouncedTerm = useDebounce(inputValue, 250);

  const isNumeric = (v) => /^\d+$/.test(String(v || '').trim());
  const isSpecialOption = (opt) => opt?.optionType === 'loadMore' || opt?.optionType === 'end';

  const addFooterRows = (list, currentPage, newTotalPages) => {
    const clean = list.filter((o) => !isSpecialOption(o));
    if (currentPage < newTotalPages) clean.push({ id: LOAD_MORE_KEY, optionType: 'loadMore' });
    else clean.push({ id: END_OF_LIST_KEY, optionType: 'end' });
    return clean;
  };

  const resetPaging = useCallback(() => {
    setOptions([]);
    setSelected(null);
    setPage(1);
    setTotalPages(1);
    setErrorText('');
    seenUserIdsRef.current = new Set();
  }, []);

  // . adminGetChats supports: page, limit, userId, chatId, status
  const buildQuery = useCallback(
    (targetPage) => {
      const params = new URLSearchParams();
      params.set('page', String(targetPage || 1));
      params.set('limit', '20');
      params.set('userId', String(receiverId));
      return params.toString();
    },
    [receiverId]
  );

  const normalize = (s) =>
    String(s || '')
      .trim()
      .toLowerCase();

  // Client-side filter only (backend doesn't support searchName here)
  const matchesTerm = useCallback((u, term) => {
    const t = normalize(term);
    if (!t) return true;

    if (isNumeric(t)) return String(u?.id || '') === String(t);

    const name = normalize(u?.full_name);
    return name.includes(t);
  }, []);

  const fetchPage = useCallback(
    async (targetPage) => {
      if (!receiverId) return;

      const seq = ++reqSeqRef.current;

      try {
        setLoading(true);
        setErrorText('');

        // . Use existing controller: adminGetChats
        const url = `${CONFIG.apiUrl}/v1/admin/chats?${buildQuery(targetPage)}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (seq !== reqSeqRef.current) return;

        if (!json?.success) throw new Error(json?.message || json?.msg || 'Failed to load chats');

        const rows = json?.data?.chats || [];
        const pag = json?.data?.pagination || {};
        const newTotalPages = Number(pag.totalPages || 1);

        const appended = [];

        for (const row of rows) {
          const p1Id = Number(row?.participant_1_id);
          const p2Id = Number(row?.participant_2_id);

          // determine receiver "side"
          const receiverIsP1 = Number(receiverId) === p1Id;
          const otherUser = receiverIsP1 ? row?.participant2 : row?.participant1;

          if (!otherUser?.id) continue;

          // . apply client-side search filter
          if (!matchesTerm(otherUser, debouncedTerm)) continue;

          // . dedupe by other user id
          if (seenUserIdsRef.current.has(otherUser.id)) continue;
          seenUserIdsRef.current.add(otherUser.id);

          const unread = receiverIsP1 ? row?.unread_count_p1 : row?.unread_count_p2;
          const isPin = receiverIsP1 ? row?.is_pin_p1 : row?.is_pin_p2;

          appended.push({
            ...otherUser,

            // chat meta
            chat_id: row?.id,
            last_message: row?.lastMessage?.message || '',
            last_message_type: row?.lastMessage?.message_type || '',
            last_message_time: row?.last_message_time || row?.lastMessage?.created_at || null,
            unread_count: Number(unread || 0),
            is_pin: Boolean(isPin),

            // (optional) can keep status too
            chat_status: receiverIsP1 ? row?.chat_status_p1 : row?.chat_status_p2,
          });
        }

        setOptions((prev) => {
          const base = targetPage === 1 ? [] : prev.filter((o) => !isSpecialOption(o));
          return addFooterRows([...base, ...appended], targetPage, newTotalPages);
        });

        setPage(targetPage);
        setTotalPages(newTotalPages);
      } catch (e) {
        setErrorText(e?.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    },
    [receiverId, token, buildQuery, matchesTerm, debouncedTerm]
  );

  // . When receiver changes: reload.
  useEffect(() => {
    resetPaging();
    if (receiverId) fetchPage(1);
  }, [receiverId, resetPaging, fetchPage]);

  // . When term changes: re-filter by resetting and fetching page 1
  useEffect(() => {
    if (!receiverId) return;
    resetPaging();
    fetchPage(1);
  }, [debouncedTerm]); // intentionally only depends on term

  const handleLoadMoreClick = (e) => {
    e?.preventDefault?.();
    if (!loading && page < totalPages) fetchPage(page + 1);
  };

  const getAvatar = (u) => {
    const av = u?.avatar || '';
    if (!av) return '';
    if (String(av).startsWith('http')) return av;
    return `${CONFIG.assetsUrl}/uploads/avatar/user/${av}`;
  };

  const getPrimary = (u) => String(u?.full_name || '').trim() || `User #${u?.id || ''}`;
  const getSecondary = (u) => {
    const bits = [];
    if (u?.id) bits.push(`#${u.id}`);
    if (u?.country) bits.push(u.country);
    if (u?.gender) bits.push(u.gender);
    return bits.join(' • ');
  };

  const displayOptions = useMemo(() => options, [options]);

  return (
    <Autocomplete
      sx={sx}
      fullWidth={fullWidth}
      disabled={disabled || !receiverId}
      loading={loading}
      options={displayOptions}
      value={selected}
      filterOptions={(x) => x}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      getOptionLabel={(opt) => {
        if (!opt) return '';
        if (opt.id === LOAD_MORE_KEY || opt.id === END_OF_LIST_KEY) return '';
        return getPrimary(opt);
      }}
      onChange={(_, newVal, reason) => {
        if (reason === 'clear') {
          setSelected(null);
          onSelect?.(null);
          return;
        }

        if (!newVal) return;

        if (newVal?.id === LOAD_MORE_KEY) {
          handleLoadMoreClick();
          return;
        }

        if (newVal?.id === END_OF_LIST_KEY) return;

        setSelected(newVal);

        onSelect?.({
          user_id: newVal.id,
          chat_id: newVal.chat_id,
          user: newVal,
        });
      }}
      onInputChange={(_, val, reason) => {
        if (reason === 'input' || reason === 'clear') setInputValue(val);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={!receiverId ? 'Select receiver user first' : placeholder}
          error={Boolean(errorText)}
          helperText={errorText || ''}
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
      renderOption={(props, option) => {
        if (option?.optionType === 'loadMore') {
          return (
            <li
              {...props}
              key={LOAD_MORE_KEY}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLoadMoreClick}
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
                  — End of list —
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
                src={getAvatar(option)}
                alt={getPrimary(option)}
                sx={{ width: 40, height: 48, borderRadius: 1 }}
              />
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {getPrimary(option)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {getSecondary(option)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  Chat #{option?.chat_id || '—'} • Unread: {Number(option?.unread_count || 0)}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}
