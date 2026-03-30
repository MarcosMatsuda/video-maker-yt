import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './components/layout/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { NewVideoModal } from './components/videos/NewVideoModal';
import { VideosPage } from './pages/VideosPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { ConfigPage } from './pages/ConfigPage';
import { GuidePage } from './pages/GuidePage';
import { videoApi } from './lib/api';

function AppLayout() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleCreate = async () => {
    try {
      const { id } = await videoApi.create({ titulo: 'Novo video' });
      setShowModal(false);
      navigate(`/video/${id}`);
    } catch {
      toast('Erro ao criar video', 'error');
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onNewVideo={() => setShowModal(true)} />
      <main className="flex-1 ml-[260px] p-8">
        <Routes>
          <Route path="/" element={<VideosPage />} />
          <Route path="/video/:id" element={<VideoDetailPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/guia" element={<GuidePage />} />
        </Routes>
      </main>
      <NewVideoModal open={showModal} onClose={() => setShowModal(false)} onCreate={handleCreate} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}
