import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/stores/auth';

/** Rejoue l'action mise de côté avant la connexion (règle d'or : on ne perd jamais l'intention). */
export function useRunPendingAction() {
  const takePending = useAuth((s) => s.takePending);
  return useCallback(() => {
    const p = takePending();
    // Rejoindre : on revient à l'écran d'origine s'il est dans la pile (pas de doublon dans l'historique)
    if (p?.type === 'join') return router.dismissTo({ pathname: '/session/[id]', params: { id: p.sessionId, autojoin: p.series ? 'series' : '1' } });
    if (p?.type === 'joinGroup') return router.dismissTo({ pathname: '/group/[id]', params: { id: p.groupId, autojoin: '1', ...(p.inviteCode ? { code: p.inviteCode } : {}) } });
    if (router.canGoBack()) router.back();
    if (!p) return;
    switch (p.type) {
      case 'create':
        router.push('/create');
        break;
      case 'createGroup':
        router.push('/group/new');
        break;
      case 'chat':
        router.push({ pathname: '/session/[id]/chat', params: { id: p.sessionId } });
        break;
    }
  }, [takePending]);
}
