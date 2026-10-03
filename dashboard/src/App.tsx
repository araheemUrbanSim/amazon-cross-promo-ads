import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './app/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Games } from './pages/Games';
import { GameDetail } from './pages/GameDetail';
import { Reports } from './pages/Reports';
import { Diagnostics } from './pages/Diagnostics';

/**
 * HashRouter keeps deep links such as #/games/<id> working on GitHub Pages: a browser refresh only ever requests
 * index.html, so no 404 fallback or server rewrite is needed.
 */
export function App() {
  const { signedIn } = useApp();
  if (!signedIn) return <Login />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="games" element={<Games />} />
          <Route path="games/:id" element={<GameDetail role="advertised" />} />
          <Route path="hosts/:id" element={<GameDetail role="host" />} />
          <Route path="reports" element={<Reports />} />
          <Route path="diagnostics" element={<Diagnostics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
