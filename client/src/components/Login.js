import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../App.css';

function Login() {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const navigate = useNavigate();
  const { trackingId } = useParams();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // Basit bir email doğrulama
    setIsValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid && trackingId) {
      navigate('/video', { 
        state: { 
          email,
          trackingId 
        }
      });
    }
  };

  return (
    <div className="login-container">
      <h1>Video İzleme Takip Sistemi</h1>
      <div className="login-form">
        <h2>Giriş Yap</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-posta Adresi:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="ornek@email.com"
              required
            />
          </div>
          <button 
            type="submit" 
            className={`watch-button ${!isValid ? 'disabled' : ''}`}
            disabled={!isValid}
          >
            Videoyu İzle
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login; 