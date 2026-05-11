import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DrawerFooter from './DrawerFooter';
import MenuItemRow from './MenuItem';
import PoliciesSection from './PoliciesSection';
import UserSummary from './UserSummary';
import { useMenuItems } from './useMenuItems';

interface Props {
  open: boolean;
  onClose: () => void;
  me: any;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onLogout: () => void;
}

export default function ProfileDrawer({
  open,
  onClose,
  me,
  publicPolicies,
  policiesOpen,
  setPoliciesOpen,
  onLogout,
}: Props) {
  const roles: string[] = me?.roles ?? [];
  const { baseItems, hostItem, venueItem, supportItems, adminItems } = useMenuItems({
    roles,
    onClose,
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 300, sm: 340 } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Account
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <UserSummary me={me} roles={roles} />
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List sx={{ py: 1 }}>
            {baseItems.map((it) => (
              <MenuItemRow key={it.label} item={it} />
            ))}
            <MenuItemRow item={hostItem} />
            <MenuItemRow item={venueItem} />
          </List>
          <Divider />
          <List sx={{ py: 1 }}>
            {supportItems.map((it) => (
              <MenuItemRow key={it.label} item={it} />
            ))}
          </List>
          {publicPolicies.length > 0 && (
            <>
              <Divider />
              <PoliciesSection
                publicPolicies={publicPolicies}
                policiesOpen={policiesOpen}
                setPoliciesOpen={setPoliciesOpen}
                onClose={onClose}
              />
            </>
          )}
          {adminItems.length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2.5, pt: 1.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 600, letterSpacing: 0.6 }}
                >
                  Admin
                </Typography>
              </Box>
              <List sx={{ pt: 0.5, pb: 1 }}>
                {adminItems.map((it) => (
                  <MenuItemRow key={it.label} item={it} />
                ))}
              </List>
            </>
          )}
        </Box>
        <Divider />
        <DrawerFooter onLogout={onLogout} />
      </Box>
    </Drawer>
  );
}
