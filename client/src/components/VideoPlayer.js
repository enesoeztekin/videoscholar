import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function VideoPlayer({ email }) {
  const [playing, setPlaying] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastPlayedSeconds, setLastPlayedSeconds] = useState(null);
  const [seeking, setSeeking] = useState(false);
  const [seekStart, setSeekStart] = useState(null);
  const [isPauseButton, setIsPauseButton] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const playerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const trackingId = location.state?.trackingId;
  const userId = email;
  const [isUserPause, setIsUserPause] = useState(true);
  const [isCommentStep, setIsCommentStep] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (!trackingId) {
      navigate('/');
      return;
    }
    fetchVideoData();
    return () => {
      // Component unmount olduğunda izleme süresini kaydet
      if (watchStartTime) {
        const endTime = Date.now();
        const duration = (endTime - watchStartTime) / 1000; // saniyeye çevir
        updateWatchTime(duration);
      }
    };
  }, [trackingId, navigate]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/tracking/${trackingId}`);
      if (!response.data) {
        throw new Error('Video bulunamadı');
      }
      setVideoData(response.data);
      await fetchInteractions();
    } catch (error) {
      console.error('Video bilgileri getirilirken hata oluştu:', error);
      setVideoData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/interactions/${trackingId}/${userId}`);
      if (response.data && response.data.interactions) {
        setInteractions(response.data.interactions);
      } else {
        setInteractions([]);
      }
    } catch (error) {
      console.error('Veriler getirilirken hata oluştu:', error);
      setInteractions([]);
    }
  };

  const handleProgress = ({ playedSeconds }) => {
    if (lastPlayedSeconds !== null && !isCommentStep) {
      const diff = Math.abs(playedSeconds - lastPlayedSeconds);
      const duration = playerRef.current?.getDuration() || 0;

      // Video sonuna geldiğinde
      if (playedSeconds >= duration - 0.5) {
        setVideoEnded(true);
      }
      
      // Video başa sarıldığında ve önceden sona gelmişse
      if (videoEnded && playedSeconds < 1) {
        handleReplay(duration);
        setVideoEnded(false);
      }
      // Normal seek işlemleri
      else if (diff > 2 && !seeking) {
        handleSeek(lastPlayedSeconds, playedSeconds);
      }
    }
    setLastPlayedSeconds(playedSeconds);
  };

  const handleReplay = async (startTime) => {
    if (!videoData) return;
    
    try {
      await axios.post(`${API_URL}/api/interactions`, {
        videoUrl: videoData.videoUrl,
        trackingId,
        userId,
        type: 'replay',
        startTime,
        endTime: 0
      });
      console.log('Tekrar oynatma verisi kaydedildi');
      await fetchInteractions();
    } catch (error) {
      console.error('Replay verisi kaydedilirken hata oluştu:', error);
    }
  };

  const handleSeek = async (startTime, endTime) => {
    if (!videoData) return;

    const seekType = endTime > startTime ? 'forward' : 'rewind';
    
    try {
      await axios.post(`${API_URL}/api/interactions`, {
        videoUrl: videoData.videoUrl,
        trackingId,
        userId,
        type: seekType,
        startTime,
        endTime
      });
      console.log(`${seekType} verisi kaydedildi:`, { başlangıç: startTime, bitiş: endTime });
      await fetchInteractions();
    } catch (error) {
      console.error('Veri kaydedilirken hata oluştu:', error);
    }
  };

  const updateWatchTime = async (duration) => {
    try {
      await axios.post(`${API_URL}/api/interactions/watch-time`, {
        videoUrl: videoData?.videoUrl,
        trackingId,
        userId,
        duration
      });
      console.log('İzleme süresi kaydedildi:', duration);
    } catch (error) {
      console.error('İzleme süresi kaydedilirken hata oluştu:', error);
    }
  };

  const handlePause = async () => {
    if (!videoData || seeking) return;

    if (!isPauseButton) {
      setIsPauseButton(false);
      return;
    }

    const currentTime = playerRef.current.getCurrentTime();
    const duration = playerRef.current.getDuration();

    // Video son saniyesindeyse durdurma olayını kaydetme
    if (duration - currentTime <= 1) {
      setIsPauseButton(false);
      return;
    }

    // İzleme süresini güncelle
    if (watchStartTime) {
      const endTime = Date.now();
      const duration = (endTime - watchStartTime) / 1000;
      setTotalWatchTime(prev => prev + duration);
      setWatchStartTime(null);
      await updateWatchTime(duration);
    }
    
    try {
      await axios.post(`${API_URL}/api/interactions`, {
        videoUrl: videoData.videoUrl,
        trackingId,
        userId,
        type: 'pause',
        startTime: currentTime,
        endTime: currentTime
      });
      console.log('Durdurma verisi kaydedildi:', currentTime);
      await fetchInteractions();
    } catch (error) {
      console.error('Veri kaydedilirken hata oluştu:', error);
    } finally {
      setIsPauseButton(false);
    }
  };

  const handlePlay = () => {
    setPlaying(true);
    setIsUserPause(true);
    if (!watchStartTime) {
      setWatchStartTime(Date.now());
    }
  };

  const handleSeekStart = () => {
    setSeeking(true);
    setIsUserPause(false);
    setSeekStart(playerRef.current.getCurrentTime());
  };

  const handleSeekEnd = () => {
    setSeeking(false);
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    
    // Seek ile başa sarıldıysa ve video önceden bitmişse
    if (videoEnded && currentTime < 1) {
      const duration = playerRef.current?.getDuration() || 0;
      handleReplay(duration);
      setVideoEnded(false);
    }
    
    setTimeout(() => {
      setIsUserPause(true);
    }, 300);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('studentUser');
    navigate('/');
  };

  const handleAddComment = async () => {
    if (!videoData || !commentText.trim()) return;

    const currentTime = playerRef.current?.getCurrentTime() || 0;
    
    try {
      const commentData = {
        videoUrl: videoData.videoUrl,
        trackingId,
        userId,
        type: 'comment',
        startTime: currentTime,
        endTime: currentTime,
        comment: {
          text: commentText.trim(),
          videoTime: currentTime
        }
      };

      console.log('Gönderilen yorum verisi:', commentData);
      
      await axios.post(`${API_URL}/api/interactions`, commentData);
      
      setCommentText('');
      setShowCommentInput(false);
      await fetchInteractions();
      toast.success('Yorum başarıyla eklendi');
    } catch (error) {
      console.error('Yorum eklenirken hata oluştu:', error);
      toast.error('Yorum eklenirken bir hata oluştu');
    }
  };

  const handleCommentStep = async (targetTime) => {
    if (!videoData) return;

    setIsCommentStep(true);
    if (playerRef.current) {
      playerRef.current.seekTo(targetTime);
    }

    try {
      await axios.post(`${API_URL}/api/interactions`, {
        videoUrl: videoData.videoUrl,
        trackingId,
        userId,
        type: 'comment-step',
        startTime: targetTime,
        endTime: targetTime
      });
      console.log('Yorum adımı kaydedildi:', targetTime);
      await fetchInteractions();
    } catch (error) {
      console.error('Veri kaydedilirken hata oluştu:', error);
    } finally {
      setTimeout(() => {
        setIsCommentStep(false);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Video yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="error-container">
        <div className="error">
          <i className="fas fa-exclamation-circle"></i>
          <p>Video bulunamadı veya yüklenemedi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-container">
      <div className="video-header">
        <h1>{videoData.title}</h1>
        <div className="video-info">
          <span className="video-duration">
            <i className="fas fa-clock"></i> {formatDuration(playerRef.current?.getDuration() || 0)}
          </span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> Çıkış Yap
          </button>
        </div>
      </div>
      
      <div className="video-content">
        <div className="video-player-container">
          <ReactPlayer
            ref={playerRef}
            url={videoData.videoUrl}
            playing={playing}
            controls={true}
            onPause={handlePause}
            onPlay={handlePlay}
            onSeekMouseDown={handleSeekStart}
            onSeekMouseUp={handleSeekEnd}
            onProgress={handleProgress}
            progressInterval={500}
            width="100%"
            height="450px"
            config={{
              file: {
                attributes: {
                  onPauseCapture: () => setIsPauseButton(true)
                }
              }
            }}
          />
          <div className="video-controls">
            <button 
              onClick={() => setShowCommentInput(!showCommentInput)}
              className="comment-button"
            >
              <i className="fas fa-comment"></i> Yorum Ekle
            </button>
          </div>
          {showCommentInput && (
            <div className="comment-input-container">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                className="comment-input"
              />
              <div className="comment-actions">
                <small className="text-text-muted">
                  Video Zamanı: {formatDuration(playerRef.current?.getCurrentTime() || 0)}
                </small>
                <div>
                  <button 
                    onClick={() => setShowCommentInput(false)}
                    className="cancel-button"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleAddComment}
                    className="submit-button"
                    disabled={!commentText.trim()}
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="comments-section">
          <h2>
            <i className="fas fa-comments"></i>
            Yorumlarınız
          </h2>
          {interactions.filter(interaction => interaction.type === 'comment').length > 0 ? (
            <div className="comments-list">
              {interactions
                .filter(interaction => interaction.type === 'comment')
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-time">
                        <i className="fas fa-clock"></i>
                        Video Zamanı: {formatDuration(comment.comment?.videoTime || 0)}
                      </span>
                      <span className="comment-date">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.comment?.text}</p>
                    <button 
                      className="jump-to-time"
                      onClick={() => {
                        if (playerRef.current && comment.comment?.videoTime) {
                          playerRef.current.seekTo(comment.comment.videoTime);
                          handleCommentStep(comment.comment.videoTime);
                        }
                      }}
                    >
                      <i className="fas fa-play"></i>
                      Bu Kısma Git
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <p className="no-comments">
              <i className="fas fa-info-circle"></i>
              Henüz yorum yapmadınız
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer; 