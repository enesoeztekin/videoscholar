import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../App.css';
import VideoUploader from './VideoUploader';

function CreateVideo() {
  const [videos, setVideos] = useState([]);
  const [videoSource, setVideoSource] = useState('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const researcherUser = JSON.parse(localStorage.getItem('researcherUser') || 'null');

  useEffect(() => {
    if (!researcherUser) {
      navigate('/researcher-login');
      return;
    }
    fetchVideos(); // Başlangıçta videoları yükle
  }, [researcherUser, navigate]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/tracking/researcher/${researcherUser.email}`);
      setVideos(response.data);
    } catch (error) {
      console.error('Videolar getirilirken hata oluştu:', error);
    }
  };

  const scrollToVideos = () => {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalVideoUrl = videoUrl;

      // Eğer video dosyası yüklendiyse, önce dosyayı yükle
      if (videoSource === 'file' && videoUrl instanceof File) {
        const formData = new FormData();
        formData.append('video', videoUrl);

        const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        finalVideoUrl = uploadResponse.data.videoUrl;
      }

      // Video tracking oluştur
      const trackingResponse = await axios.post('http://localhost:5000/api/tracking', {
        videoUrl: finalVideoUrl,
        title: videoTitle,
        description,
        researcherEmail: researcherUser.email
      });

      if (trackingResponse.data) {
        toast.success('Video başarıyla oluşturuldu!');
        // Form alanlarını temizle
        setVideoUrl('');
        setVideoTitle('');
        setDescription('');
        setThumbnailUrl(''); // Bu state'i de eklememiz gerekiyor
        await fetchVideos();
        scrollToVideos();
      }
    } catch (error) {
      console.error('Video yüklenirken hata:', error);
      toast.error('Video yüklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUploaded = (url, file, thumbnail) => {
    setVideoUrl(file); // Dosyayı sakla
    setThumbnailUrl(thumbnail); // Thumbnail URL'sini sakla
    if (!videoTitle && file.name) {
      setVideoTitle(file.name.split('.')[0]); // Dosya adını varsayılan başlık olarak kullan
    }
  };

  const getTrackingUrl = (trackingId) => {
    return `${window.location.origin}/watch/${trackingId}`;
  };

  const handleDeleteVideo = async (trackingId) => {
    try {
      await axios.delete(`http://localhost:5000/api/tracking/${trackingId}`);
      toast.success('Video başarıyla silindi');
      fetchVideos(); // Videoları yeniden yükle
    } catch (error) {
      console.error('Video silinirken hata oluştu:', error);
      toast.error('Video silinirken bir hata oluştu');
    }
  };

  return (
    <div className="researcher-container">
      <div className="header-with-back">
        <button onClick={() => navigate('/researcher-panel', { state: { email: researcherUser.email } })} className="back-button">
          <i className="fas fa-arrow-left"></i> Geri
        </button>
        <h1>Yeni Video Oluştur</h1>
      </div>

      <div className="create-video-form">
        <div className="video-source-toggle">
          <label>
            <input
              type="radio"
              value="url"
              checked={videoSource === 'url'}
              onChange={(e) => setVideoSource(e.target.value)}
            />
            Video URL
          </label>
          <label>
            <input
              type="radio"
              value="file"
              checked={videoSource === 'file'}
              onChange={(e) => setVideoSource(e.target.value)}
            />
            Lokal Video
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          {videoSource === 'url' ? (
            <div className="form-group">
              <label>Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Video URL'sini girin"
                required={videoSource === 'url'}
              />
              <span className="form-help">YouTube veya Vimeo video URL'si girin</span>
            </div>
          ) : (
            <VideoUploader onVideoUploaded={handleVideoUploaded} />
          )}

          <div className="form-group">
            <label>Video Başlığı</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Video başlığını girin"
              required
            />
          </div>

          <div className="form-group">
            <label>Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video açıklamasını girin"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="create-button" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Video Oluşturuluyor...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i>
                Video Oluştur
              </>
            )}
          </button>
        </form>
      </div>

      <div className="videos-list">
        <h2>Oluşturduğunuz Videolar</h2>
        {videos.length > 0 ? (
          <div className="video-grid">
            {videos.map((video) => (
              <div key={video.trackingId} className="video-card">
                <div className="video-card-header">
                  <h3>{video.title}</h3>
                  <button 
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Bu videoyu silmek istediğinizden emin misiniz?')) {
                        handleDeleteVideo(video.trackingId);
                      }
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <p>{video.description}</p>
                <div className="video-info">
                  <small>Oluşturulma: {new Date(video.createdAt).toLocaleDateString()}</small>
                </div>
                <div className="tracking-url">
                  <p>Tracking URL:</p>
                  <input
                    type="text"
                    value={getTrackingUrl(video.trackingId)}
                    readOnly
                    onClick={(e) => e.target.select()}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Henüz video tracking oluşturmadınız.</p>
        )}
      </div>
    </div>
  );
}

export default CreateVideo; 