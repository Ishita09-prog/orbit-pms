import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import { Button, EmptyState } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Projects from './pages/Projects.jsx';
import Register from './pages/Register.jsx';
import Tasks from './pages/Tasks.jsx';

function LoaderScreen() {
  return (
    <div className="loader-screen" role="status" aria-label="Loading">
      <div className="loader-orbit" />
    </div>
  );
}

function Protected({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoaderScreen />;
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function PublicOnly({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoaderScreen />;
  if (status === 'authed') return <Navigate to="/" replace />;
  return children;
}

function NotFound() {
  return (
    <EmptyState icon={Compass} title="Page not found" action={<Link to="/"><Button>Go to dashboard</Button></Link>}>
      The page you’re looking for doesn’t exist.
    </EmptyState>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
