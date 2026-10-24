import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './ui/EmptyState';
import { Icons } from './ui/icons';

/** Invitation à se connecter (on n'impose jamais la connexion pour explorer). */
export function SignInPrompt({ message }: { message?: string }) {
  const { t } = useTranslation();
  return <EmptyState title={message ?? t('profile.signInPrompt')} actionLabel={t('profile.signIn')} actionIcon={Icons.UserCircle} onAction={() => router.push('/auth')} />;
}
