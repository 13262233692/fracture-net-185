import { AppUI } from './ui/AppUI';

const appContainer = document.getElementById('app');
if (appContainer) {
  const app = new AppUI(appContainer);
  
  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
}
