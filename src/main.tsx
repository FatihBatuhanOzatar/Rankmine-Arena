import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Arena from './pages/Arena';
import './index.css';
import './components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/arena/:id" element={<Arena />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
