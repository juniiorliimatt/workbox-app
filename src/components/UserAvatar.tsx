import { FC, ReactNode } from 'react';
import { Avatar, SxProps, Theme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '@/hooks/useAuth';
import { useAuthenticatedAvatar } from '@/hooks/useAuthenticatedAvatar';

interface IUserAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  sx?: SxProps<Theme>;
  children?: ReactNode;
  'data-testid'?: string;
}

export const UserAvatar: FC<IUserAvatarProps> = ({
  avatarUrl,
  name,
  sx,
  children,
  'data-testid': testId,
}) => {
  const { accessToken } = useAuth();
  const blobUrl = useAuthenticatedAvatar(avatarUrl, accessToken);

  return (
    <Avatar src={blobUrl || undefined} sx={sx} data-testid={testId}>
      {!blobUrl && (children || (name ? name.charAt(0).toUpperCase() : <PersonIcon />))}
    </Avatar>
  );
};

export default UserAvatar;
