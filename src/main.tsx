import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Log version info prominently in developer console for Railway deployment verification
console.log(
  "%c 🚀 RAILWAY MANAGEMENT PORTAL v2.4.0 %c (No-Timeout, Process Inspector & Memory Optimized) ",
  "background: #4f46e5; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
  "background: #1e1b4b; color: #818cf8; padding: 4px 8px; border-radius: 0 4px 4px 0;"
);

createRoot(document.getElementById('root')!).render(
  <App />
);


