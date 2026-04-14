import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { FlowProvider } from './context/FlowContext';
import { ThemeProvider } from './context/ThemeContext';
import { DrawingProvider } from './context/DrawingContext';
import { SunPathProvider } from './context/SunPathContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FlowProvider>
        <DrawingProvider>
          <SunPathProvider>
            <App />
          </SunPathProvider>
        </DrawingProvider>
      </FlowProvider>
    </ThemeProvider>
  </React.StrictMode>
);
