import { createApp } from 'vue';
import App from './App.vue';
import './ui/style.css';
import { reportError } from './core/machine';

const app = createApp(App);

// nikdy biela obrazovka — chyba sa zapíše a aplikácia pokračuje
app.config.errorHandler = (err) => { console.error(err); reportError(err); };
window.addEventListener('error', (e) => reportError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason));

app.mount('#app');
