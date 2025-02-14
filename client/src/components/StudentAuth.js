import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import '../App.css';

function StudentAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    studentNumber: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { trackingId } = useParams();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    if (!validateEmail(formData.email)) {
      toast.error('Geçerli bir e-posta adresi giriniz');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return false;
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Şifreler eşleşmiyor');
        return false;
      }

      if (!formData.studentNumber) {
        toast.error('Öğrenci numarası gereklidir');
        return false;
      }

      if (!formData.department) {
        toast.error('Bölüm bilgisi gereklidir');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Giriş işlemi
        const response = await axios.post('http://localhost:5000/api/student/login', {
          email: formData.email,
          password: formData.password
        });
        
        // Kullanıcı bilgilerini localStorage'a kaydet
        localStorage.setItem('studentUser', JSON.stringify({
          email: formData.email,
          name: response.data.student.name,
          studentNumber: response.data.student.studentNumber,
          department: response.data.student.department
        }));
        
        toast.success('Giriş başarılı!');
        if (trackingId) {
          navigate('/video', { 
            state: { 
              email: formData.email,
              trackingId 
            }
          });
        }
      } else {
        // Kayıt işlemi
        const response = await axios.post('http://localhost:5000/api/student/register', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          studentNumber: formData.studentNumber,
          department: formData.department
        });
        
        toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
        setIsLogin(true);
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      }
    } catch (error) {
      let errorMessage = 'Bir hata oluştu';
      if (error.response) {
        errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = 'Sunucuya bağlanılamadı';
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Video İzleme Sistemi</h1>
          <h2>Öğrenci {isLogin ? 'Girişi' : 'Kaydı'}</h2>
        </div>

        <div className="auth-toggle">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Giriş Yap
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Ad Soyad</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Adınız ve soyadınız"
                  required={!isLogin}
                />
              </div>

              <div className="form-group">
                <label>Öğrenci Numarası</label>
                <input
                  type="text"
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={handleInputChange}
                  placeholder="Öğrenci numaranız"
                  required={!isLogin}
                />
              </div>

              <div className="form-group">
                <label>Bölüm</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Bölümünüz"
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>E-posta Adresi</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="********"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Şifre Tekrar</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="********"
                required={!isLogin}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {isLogin ? 'Giriş yapılıyor...' : 'Kayıt yapılıyor...'}
              </>
            ) : (
              <>
                <i className={`fas fa-${isLogin ? 'sign-in-alt' : 'user-plus'}`}></i>
                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentAuth; 