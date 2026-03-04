'use client';

import { alpha } from '@mui/material/styles';
import {
  Box,
  Chip,
  List,
  Paper,
  Stack,
  Avatar,
  Button,
  Divider,
  Typography,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  CircularProgress,
} from '@mui/material';

import {  formatTime } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';



export default function AdminChatChats({
  selectedUser,
  chats = [],
  loading,
  page,
  pagination,
  chatSearch = '',
  onOpenChat,
  onPageChange,
  getAvatarUrl,
}) {
  const q = String(chatSearch || '')
    .trim()
    .toLowerCase();

  const filtered = !q
    ? chats
    : chats.filter((c) => {
        const p1 = c?.participant1?.full_name?.toLowerCase?.() || '';
        const p2 = c?.participant2?.full_name?.toLowerCase?.() || '';
        const id = String(c?.id || '');
        return p1.includes(q) || p2.includes(q) || id.includes(q);
      });

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Box sx={{ minHeight: 520 }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
            <Typography variant="caption" sx={{ mt: 1 }} color="text.secondary">
              Loading chats…
            </Typography>
          </Stack>
        ) : (
          <List disablePadding sx={{ display: 'grid', gap: 1 }}>
            {filtered.map((c) => {
              const selectedId = Number(selectedUser?.id || 0);

              const p1 = c?.participant1 || null;
              const p2 = c?.participant2 || null;

              const other =
                selectedId && Number(c?.participant_1_id) === selectedId
                  ? p2
                  : selectedId && Number(c?.participant_2_id) === selectedId
                    ? p1
                    : p2 || p1;

              const otherName = other?.full_name || other?.username || `#${other?.id || '—'}`;
              const otherEmail = other?.email || other?.phone || '—';

              const unread = (c?.unread_count_p1 || 0) + (c?.unread_count_p2 || 0);

              return (
                <Paper
                  key={c.id}
                  variant="outlined"
                  sx={(theme) => ({
                    borderRadius: 2,
                    overflow: 'hidden',
                    borderColor: alpha(theme.palette.divider, 0.9),
                    transition: '0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                      borderColor: alpha(theme.palette.primary.main, 0.35),
                    },
                  })}
                >
                  <ListItemButton onClick={() => onOpenChat?.(c)} sx={{ py: 1.4, px: 1.6 }}>
                    <ListItemAvatar>
                      <Avatar
                        src={getAvatarUrl?.(other) || ''}
                        alt={otherName}
                        sx={{ width: 46, height: 46 }}
                      />
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ maxWidth: 520 }}>
                              {otherName}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 520 }}
                            >
                              {otherEmail}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(c?.last_message_time || c?.updated_at)}
                            </Typography>

                            {unread > 0 ? (
                              <Chip size="small" color="error" label={unread} sx={{ height: 20 }} />
                            ) : (
                              <Chip size="small" variant="outlined" label="0" sx={{ height: 20 }} />
                            )}
                          </Stack>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Last:{' '}
                          {c?.lastMessage?.status === 'deleted'
                            ? 'Deleted message'
                            : c?.lastMessage?.message || '—'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </Paper>
              );
            })}

            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 8 }}>
                <Iconify icon="mdi:chat-outline" width={40} />
                <Typography sx={{ mt: 1 }} color="text.secondary">
                  No chats found {selectedUser?.username ? `for ${selectedUser.username}` : ''}
                </Typography>
              </Stack>
            )}
          </List>
        )}
      </Box>

      <Divider />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button
          size="small"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange?.(Math.max(1, page - 1))}
          startIcon={<Iconify icon="mdi:chevron-left" />}
        >
          Prev
        </Button>

        <Typography variant="caption" color="text.secondary">
          Page {page} / {pagination?.totalPages || 1}
        </Typography>

        <Button
          size="small"
          disabled={page >= (pagination?.totalPages || 1) || loading}
          onClick={() => onPageChange?.(page + 1)}
          endIcon={<Iconify icon="mdi:chevron-right" />}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}
