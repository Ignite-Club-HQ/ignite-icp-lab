import { installNetworkGuard } from './lab/networkGuard.mjs';
import './index.css';
installNetworkGuard();

Promise.all([import('react-dom/client'), import('./App')]).then(([{ createRoot }, { default: App }]) => {
  createRoot(document.getElementById('root')!).render(<App />);
});
