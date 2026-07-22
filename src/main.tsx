import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProvider } from './app/AppContext';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/controls.css';
import './styles/workspace.css';
import './styles/modals.css';
import './styles/review-export.css';
import './styles/planned-features.css';
import './styles/resize-layer.css';
import './styles/history.css';
import './styles/shape-size.css';
import './styles/pen-resize.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
