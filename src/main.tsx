import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { FlowProvider } from './context/FlowContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FlowProvider>
        <App />
      </FlowProvider>
    </ThemeProvider>
  </React.StrictMode>
);
