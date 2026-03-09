import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { safeJoin } from 'src/utils/helper';

import { CONFIG } from 'src/global-config';
import { useAppContext } from 'src/contexts/app-context';

import { Label } from 'src/components/label';
import { CustomPopover } from 'src/components/custom-popover';

import { AccountButton } from './account-button';
import { SignOutButton } from './log-out-button';

// ----------------------------------------------------------------------

export function AccountPopover({ data = [], sx, ...other }) {
  const pathname = usePathname();

  const { open, anchorEl, onClose, onOpen } = usePopover();

  // const { user } = useMockedUser();
  const { user } = useAppContext();

  const photoURL = user?.avatar
    ? safeJoin(CONFIG.assetsUrl, `uploads/avatar/admin/${user.avatar}`)
    : undefined;
  console.log('POPOVER USER =>', user);
  console.log('POPOVER photoURL =>', photoURL);
  console.log('LOCALSTORAGE USER =>', localStorage.getItem('user'));
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || '';
  const renderMenuActions = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{ paper: { sx: { p: 0, width: 200 } }, arrow: { offset: 20 } }}
    >
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Typography variant="subtitle2" noWrap>
          {displayName}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {user?.email}
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <MenuList sx={{ p: 1, my: 1, '& li': { p: 0 } }}>
        {data.map((option) => {
          const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';
          const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;

          return (
            <MenuItem key={option.label}>
              <Link
                component={RouterLink}
                href={option.label === 'Home' ? rootHref : option.href}
                color="inherit"
                underline="none"
                onClick={onClose}
                sx={{
                  px: 1,
                  py: 0.75,
                  width: 1,
                  display: 'flex',
                  typography: 'body2',
                  alignItems: 'center',
                  color: 'text.secondary',
                  '& svg': { width: 24, height: 24 },
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {option.icon}

                <Box component="span" sx={{ ml: 2 }}>
                  {option.label === 'Home' ? rootLabel : option.label}
                </Box>

                {option.info && (
                  <Label color="error" sx={{ ml: 1 }}>
                    {option.info}
                  </Label>
                )}
              </Link>
            </MenuItem>
          );
        })}
      </MenuList>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 1 }}>
        <SignOutButton
          size="medium"
          variant="text"
          onClose={onClose}
          sx={{ display: 'block', textAlign: 'left' }}
        />
      </Box>
    </CustomPopover>
  );

  return (
    <>
      <AccountButton
        onClick={onOpen}
        photoURL={photoURL}
        displayName={displayName}
        sx={sx}
        {...other}
      />
      {renderMenuActions()}
    </>
  );
}
