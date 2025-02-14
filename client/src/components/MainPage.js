import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function MainPage() {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Video İzleme Takip Sistemi</h1>
          <h2>Hoş Geldiniz</h2>
        </div>

        <div className="main-buttons">
          <button 
            className="main-button researcher"
            onClick={() => navigate('/researcher-login')}
          >
            <i className="fas fa-user-tie"></i>
            Araştırmacı Girişi
          </button>

          <button 
            className="main-button student"
            onClick={() => navigate('/student-login')}
          >
            <i className="fas fa-user-graduate"></i>
            Öğrenci <br/> Girişi
          </button>
        </div>
      </div>


    </div>
  );
}

export default MainPage; 