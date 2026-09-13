import { useEffect, useState } from 'react';
import api from '@/services/api';

const avatarPromiseCache = new Map<string, Promise<string>>();

export const useAuthenticatedAvatar = (
  avatarUrl?: string | null,
  accessToken?: string | null
): string | null => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!avatarUrl) {
      setBlobUrl(null);
      return;
    }

    if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:')) {
      setBlobUrl(avatarUrl);
      return;
    }

    const cacheKey = `${avatarUrl}_${accessToken || 'anon'}`;

    if (avatarPromiseCache.has(cacheKey)) {
      avatarPromiseCache.get(cacheKey)!.then(url => {
        if (active) setBlobUrl(url);
      }).catch(() => {
        if (active) setBlobUrl(null);
      });
      return;
    }

    const fetchPromise = api.get(avatarUrl, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      responseType: 'blob',
    }).then(response => {
      return URL.createObjectURL(response.data);
    });

    avatarPromiseCache.set(cacheKey, fetchPromise);

    fetchPromise.then(url => {
      if (active) setBlobUrl(url);
    }).catch(() => {
      avatarPromiseCache.delete(cacheKey);
      if (active) setBlobUrl(null);
    });

    return () => {
      active = false;
    };
  }, [avatarUrl, accessToken]);

  return blobUrl;
};

export default useAuthenticatedAvatar;
