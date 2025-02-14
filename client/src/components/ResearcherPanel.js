import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../App.css';

function ResearcherPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const researcherUser = JSON.parse(localStorage.getItem('researcherUser') || 'null');

  React.useEffect(() => {
    if (!researcherUser) {
      navigate('/researcher-login');
    }
  }, [researcherUser, navigate]);

  const handleCreateVideo = () => {
    navigate('/create-video', { state: { email: researcherUser.email } });
  };

  const handleViewInteractions = () => {
    navigate('/view-interactions', { state: { email: researcherUser.email } });
  };

  const handleLogout = () => {
    localStorage.removeItem('researcherUser');
    toast.success('Çıkış yapıldı');
    navigate('/');
  };

  if (!researcherUser) {
    return null;
  }

  return (
    <div className="researcher-container">
      <div className="researcher-header">
        <div className="researcher-info">
          <h1>Araştırmacı Paneli</h1>
          <p>Hoş geldiniz, {researcherUser.name}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <i className="fas fa-sign-out-alt"></i> Çıkış Yap
        </button>
      </div>
      <div className="main-buttons">
        <button onClick={handleCreateVideo} className="main-button create">
          <i className="fas fa-video"></i>
          Video Oluştur
        </button>
        <button onClick={handleViewInteractions} className="main-button view">
          <i className="fas fa-chart-line"></i>
          Etkileşimleri İzle
        </button>
      </div>
    </div>
  );
}

export default ResearcherPanel; 