import { useEffect, useState } from 'react';
import api from '@/services/api';

export const useAuthenticatedAvatar = (
  avatarUrl?: string | null,
  accessToken?: string | null
): string | null => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;

    if (!avatarUrl) {
      setBlobUrl(null);
      return;
    }

    if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:')) {
      setBlobUrl(avatarUrl);
      return;
    }

    const fetchAvatarBlob = async () => {
      try {
        const response = await api.get(avatarUrl, {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          responseType: 'blob',
        });

        if (active) {
          currentObjectUrl = URL.createObjectURL(response.data);
          setBlobUrl(currentObjectUrl);
        }
      } catch {
        if (active) {
          setBlobUrl(null);
        }
      }
    };

    fetchAvatarBlob();

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [avatarUrl, accessToken]);

  return blobUrl;
};

export default useAuthenticatedAvatar;
