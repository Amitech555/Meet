// Point d'entrée. En mode démo (aperçu web hébergé), la page peut être servie depuis un chemin
// arbitraire : on ramène l'URL à la racine pour que le routeur ouvre l'accueil.
if (process.env.EXPO_PUBLIC_DEMO === '1' && typeof window !== 'undefined') {
  const known = /^\/(session|group|g|s|u|onboarding|create|auth|admin|host|search|notifications|terms|styleguide|groups|sessions|profile)(\/|$)/;
  if (window.location.pathname !== '/' && !known.test(window.location.pathname)) window.history.replaceState(null, '', '/');
}
require('expo-router/entry');
