import { loadEnv } from 'vite';

/** Only public Web3Forms keys are emitted. Recipient verification is a separate activation gate. */
export function tourFormConfigPlugin() {
  let publicConfig;
  function configBody() { return JSON.stringify(publicConfig); }
  return {
    name: 'sta-tour-form-config',
    configResolved(config) {
      const env = { ...loadEnv(config.mode, process.cwd(), 'VITE_'), ...process.env };
      publicConfig = {
        primaryKey: env.VITE_WEB3FORMS_ACCESS_KEY || '',
        copyKey: env.VITE_WEB3FORMS_ACCESS_KEY_2 || '',
        recipientsVerified: env.VITE_TOUR_FORM_RECIPIENTS_VERIFIED === 'true',
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/modulo-tour/config.json') return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(configBody());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'modulo-tour/config.json', source: configBody() });
    },
  };
}
