import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/stores/auth';

/** Rejoue l'action mise de côté avant la connexion (règle d'or : on ne perd jamais l'intention). */
export function useRunPendingAction() {
  const takePending = useAuth((s) => s.takePending);
  return useCallback(() => {
    const p = takePending();
    if (router.canGoBack()) router.back();
    if (!p) return;
    switch (p.type) {
      case 'join':
        router.push({ pathname: '/session/[id]', params: { id: p.sessionId, autojoin: p.series ? 'series' : '1' } });
        break;
      case 'create':
        router.push('/create');
        break;
      case 'createGroup':
        router.push('/group/new');
        break;
      case 'joinGroup':
        router.push({ pathname: '/group/[id]', params: { id: p.groupId, autojoin: '1', ...(p.inviteCode ? { code: p.inviteCode } : {}) } });
        break;
      case 'chat':
        router.push({ pathname: '/session/[id]/chat', params: { id: p.sessionId } });
        break;
    }
  }, [takePending]);
}
