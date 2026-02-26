import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Landing from './pages/Landing';
import Arena from './pages/Arena';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="arena/:id" element={<Arena />} />
      </Route>
    </Routes>
  );
}

export default App;
