// Configuration dynamique : identique à app.json, sauf pour la build de démo (aperçu web autonome)
// où le découpage des routes est désactivé pour obtenir un seul fichier JavaScript à embarquer.
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_DEMO !== '1') return config;
  return {
    ...config,
    plugins: config.plugins.map((p) => (p === 'expo-router' ? ['expo-router', { asyncRoutes: false }] : p)),
  };
};
