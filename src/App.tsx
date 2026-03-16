import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Landing from './pages/Landing';
import Arena from './pages/Arena';
import PublicArena from './pages/PublicArena';

function App() {
  return (
    <Routes>
      {/* Public route — outside AppShell (no organizer chrome) */}
      <Route path="/p/:slug" element={<PublicArena />} />

      {/* Organizer routes — inside AppShell */}
      <Route path="/" element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="arena/:id" element={<Arena />} />
      </Route>
    </Routes>
  );
}

export default App;

