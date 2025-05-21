import React, { useState, useEffect, useRef, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import axios from 'axios';
import '../App.css';
import { toast } from 'react-toastify';
import ReactPlayer from 'react-player';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const VideoPopup = memo(({ videoUrl, startTime, onClose }) => {
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    if (isReady && playerRef.current && startTime) {
      playerRef.current.seekTo(startTime);
    }
  }, [isReady, startTime]);

  return (
    <div className="video-popup-overlay">
      <div className="video-popup">
        <div className="video-popup-header">
          <h3 className="video-popup-title">Video Önizleme</h3>
          <button className="close-popup" onClick={() => {
            setIsReady(false);
            onClose();
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="video-popup-content">
          <ReactPlayer
            ref={playerRef}
            key={videoUrl}
            url={videoUrl}
            controls={true}
            width="100%"
            height="500px"
            playing={false}
            onReady={() => setIsReady(true)}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  disablePictureInPicture: true
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
});

function ViewInteractions() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const researcherUser = JSON.parse(localStorage.getItem('researcherUser') || 'null');
  const [expandedUsers, setExpandedUsers] = useState([]);
  const [expandedTypes, setExpandedTypes] = useState([]);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!researcherUser) {
      navigate('/researcher-login');
      return;
    }
    fetchVideos();
  }, [researcherUser, navigate]);

  useEffect(() => {
    // Arama terimini kullanarak etkileşimleri filtrele
    if (interactions.length > 0) {
      const filtered = interactions.filter(interaction =>
        interaction.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInteractions(filtered);
    }
  }, [searchTerm, interactions]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tracking/researcher/${researcherUser.email}`);
      setVideos(response.data || []);
    } catch (error) {
      console.error('Videolar getirilirken hata oluştu:', error);
      setVideos([]);
    }
  };

  const fetchInteractions = async (trackingId) => {
    try {
      console.log('Etkileşimler getiriliyor:', trackingId);
      const response = await axios.get(`${API_URL}/api/interactions/tracking/${trackingId}`);
      console.log('Gelen etkileşimler:', response.data);
      setInteractions(response.data || []);
    } catch (error) {
      console.error('Etkileşimler getirilirken hata oluştu:', error);
      setInteractions([]);
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    if (video && video.trackingId) {
      fetchInteractions(video.trackingId);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateVideoStatistics = (interactions) => {
    if (!interactions || interactions.length === 0) return null;

    // Tüm etkileşimleri düzleştir
    const allInteractions = interactions.reduce((acc, user) => {
      return [...acc, ...(user.interactions || [])];
    }, []);

    // Toplam izlenme süresi hesaplama
    const totalVideoWatchTime = interactions.reduce((total, user) => {
      return total + (user.totalWatchTime || 0);
    }, 0);

    // Kullanıcı bazında izlenme süreleri
    const userWatchTimes = interactions.map(user => ({
      userId: user.userId,
      watchTime: user.totalWatchTime || 0
    }));

    // Geri sarma etkileşimlerini filtrele
    const rewindInteractions = allInteractions.filter(i => i.type === 'rewind');

    // Her başlangıç zamanı için sayaç oluştur
    const startTimeCounter = {};
    const timeRanges = {};

    rewindInteractions.forEach(interaction => {
      const startTimeKey = Math.floor(interaction.startTime);
      startTimeCounter[startTimeKey] = (startTimeCounter[startTimeKey] || 0) + 1;

      // Zaman aralıklarını kaydet
      const rangeKey = `${startTimeKey}-${Math.floor(interaction.endTime)}`;
      timeRanges[rangeKey] = (timeRanges[rangeKey] || 0) + 1;
    });

    // En çok tekrar edilen başlangıç zamanını bul
    let maxStartTime = 0;
    let maxStartCount = 0;
    Object.entries(startTimeCounter).forEach(([time, count]) => {
      if (count > maxStartCount) {
        maxStartCount = count;
        maxStartTime = parseInt(time);
      }
    });

    // En çok tekrar edilen zaman aralığını bul
    let maxTimeRange = '';
    let maxRangeCount = 0;
    Object.entries(timeRanges).forEach(([range, count]) => {
      if (count > maxRangeCount) {
        maxRangeCount = count;
        maxTimeRange = range;
      }
    });

    // Etkileşim türlerine göre sayıları hesapla
    const interactionCounts = allInteractions.reduce((acc, interaction) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalInteractions: allInteractions.length,
      uniqueUsers: interactions.length,
      totalVideoWatchTime,
      userWatchTimes,
      mostReplayedTime: {
        startTime: maxStartTime,
        count: maxStartCount
      },
      mostReplayedRange: {
        range: maxTimeRange,
        count: maxRangeCount
      },
      interactionCounts
    };
  };


  const toggleUserInteractions = (userId) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleInteractionType = (type) => {
    setExpandedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const groupInteractionsByUser = (interactions) => {
    // Önce tüm etkileşimleri kullanıcı ID'sine göre grupla
    const userInteractions = {};
    
    interactions.forEach(interaction => {
      if (!userInteractions[interaction.userId]) {
        userInteractions[interaction.userId] = [];
      }
      userInteractions[interaction.userId].push(...interaction.interactions);
    });

    // Her kullanıcı için etkileşimleri zamana göre sırala
    Object.keys(userInteractions).forEach(userId => {
      userInteractions[userId].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });

    return userInteractions;
  };

  const handleShowInVideo = (startTime) => {
    if (!showVideoPopup) {
      setSelectedTime(startTime);
      setShowVideoPopup(true);
    }
  };

  const exportToExcel = () => {
    if (!selectedVideo || !interactions || interactions.length === 0) {
      toast.error('Dışa aktarılacak veri bulunamadı.');
      return;
    }

    try {
      // Tüm kullanıcıların etkileşimlerini düzleştir
      const allData = [];
      
      interactions.forEach(userInteraction => {
        const userId = userInteraction.userId;
        const totalWatchTime = userInteraction.totalWatchTime || 0;
        
        // Her kullanıcının etkileşimlerini ekle
        if (userInteraction.interactions && userInteraction.interactions.length > 0) {
          userInteraction.interactions.forEach(interaction => {
            allData.push({
              'Kullanıcı ID': userId,
              'Toplam İzleme Süresi (sn)': totalWatchTime,
              'Etkileşim Türü': interaction.type === 'pause' ? 'Durdurma' : 
                               interaction.type === 'forward' ? 'İleri Sarma' :
                               interaction.type === 'rewind' ? 'Geri Sarma' :
                               interaction.type === 'replay' ? 'Tekrar İzleme' :
                               interaction.type === 'comment' ? 'Yorum' :
                               interaction.type === 'comment-step' ? 'Yorum Görüntüleme' : interaction.type,
              'Başlangıç Zamanı (sn)': interaction.startTime,
              'Bitiş Zamanı (sn)': interaction.endTime || interaction.startTime,
              'Zaman Damgası': new Date(interaction.timestamp).toLocaleString(),
              'Yorum': interaction.type === 'comment' && interaction.comment ? interaction.comment.text : ''
            });
          });
        } else {
          // Etkileşim olmayan kullanıcıları da ekle
          allData.push({
            'Kullanıcı ID': userId,
            'Toplam İzleme Süresi (sn)': totalWatchTime,
            'Etkileşim Türü': 'Etkileşim Yok',
            'Başlangıç Zamanı (sn)': '',
            'Bitiş Zamanı (sn)': '',
            'Zaman Damgası': '',
            'Yorum': ''
          });
        }
      });

      // Excel çalışma kitabı oluştur
      const worksheet = XLSX.utils.json_to_sheet(allData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Etkileşimler');
      
      // Sütun genişliklerini ayarla
      const maxWidth = [15, 20, 15, 15, 15, 25, 50];
      worksheet['!cols'] = maxWidth.map(width => ({ width }));

      // Excel dosyasını indir
      const fileName = `${selectedVideo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_etkileşimler.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Etkileşim verileri Excel dosyasına aktarıldı.');
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      toast.error('Excel dışa aktarma sırasında bir hata oluştu.');
    }
  };

  const renderUserInteractions = (interactions) => {
    const userInteractions = groupInteractionsByUser(interactions);

    return Object.entries(userInteractions).map(([userId, events]) => {
      const groupedByType = {
        pause: events.filter(e => e.type === 'pause'),
        forward: events.filter(e => e.type === 'forward'),
        rewind: events.filter(e => e.type === 'rewind'),
        replay: events.filter(e => e.type === 'replay'),
        comment: events.filter(e => e.type === 'comment'),
        'comment-step': events.filter(e => e.type === 'comment-step')
      };

      const userWatchTime = interactions.find(i => i.userId === userId)?.totalWatchTime || 0;

      // Her yorum için comment-step sayısını hesapla
      const commentStepCounts = {};
      groupedByType['comment-step'].forEach(step => {
        commentStepCounts[step.startTime] = (commentStepCounts[step.startTime] || 0) + 1;
      });

      return (
        <div key={userId} className="user-interaction-card">
          <div 
            className={`user-header ${expandedUsers.includes(userId) ? 'expanded' : ''}`}
            onClick={() => toggleUserInteractions(userId)}
          >
            <h3>
              <i className="fas fa-user"></i>
              {userId}
              <span className="watch-time-badge">
                <i className="fas fa-clock"></i>
                {formatDuration(userWatchTime)}
              </span>
              <span className="replay-badge">
                <i className="fas fa-redo"></i>
                {groupedByType.replay.length} tekrar
              </span>
            </h3>
            <div className="user-header-right">
              <span className="interaction-count">
                {events.length} etkileşim
              </span>
              <i className={`fas fa-chevron-${expandedUsers.includes(userId) ? 'up' : 'down'}`}></i>
            </div>
          </div>
          {expandedUsers.includes(userId) && (
            <div className="interaction-list">
              {Object.entries(groupedByType).map(([type, typeEvents]) => (
                typeEvents.length > 0 && type !== 'comment-step' && (
                  <div key={type} className="interaction-type-group">
                    <div 
                      className={`interaction-type-header ${expandedTypes.includes(`${userId}-${type}`) ? 'expanded' : ''}`}
                      onClick={() => toggleInteractionType(`${userId}-${type}`)}
                    >
                      <h4>
                        {type === 'pause' ? '⏸️ Durdurma' : 
                         type === 'forward' ? '⏩ İleri Sarma' :
                         type === 'rewind' ? '⏪ Geri Sarma' :
                         type === 'replay' ? '🔄 Tekrar İzleme' :
                         type === 'comment' ? '💬 Yorumlar' : ''} 
                        <span className="type-count">({typeEvents.length})</span>
                      </h4>
                      <i className={`fas fa-chevron-${expandedTypes.includes(`${userId}-${type}`) ? 'up' : 'down'}`}></i>
                    </div>
                    {expandedTypes.includes(`${userId}-${type}`) && (
                      <div className="interaction-items">
                        {typeEvents.map((event, index) => (
                          <div key={index} className="interaction-item">
                            {type === 'comment' ? (
                              <div className="comment-content">
                                <div className="comment-header">
                                  <span className="comment-time">
                                    Video Zamanı: {event.comment && event.comment.videoTime ? formatDuration(event.comment.videoTime) : 'Belirtilmemiş'}
                                    {commentStepCounts[event.comment?.videoTime] && (
                                      <span className="step-count-badge">
                                        <i className="fas fa-eye"></i>
                                        {commentStepCounts[event.comment.videoTime]} kez görüntülendi
                                      </span>
                                    )}
                                  </span>
                                  <button 
                                    className="show-in-video small"
                                    onClick={() => handleShowInVideo(event.comment?.videoTime || 0)}
                                  >
                                    <i className="fas fa-play"></i>
                                    Videoda Göster
                                  </button>
                                  <span className="interaction-date">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="comment-text">{event.comment ? event.comment.text : 'Yorum içeriği bulunamadı'}</p>
                              </div>
                            ) : (
                              <>
                                <span className="interaction-time">
                                  {event.type === 'pause' ? 
                                    formatDuration(event.startTime) :
                                    `${formatDuration(event.startTime)} → ${formatDuration(event.endTime)}`                                  }
                                </span>
                                <button 
                                  className="show-in-video small"
                                  onClick={() => handleShowInVideo(event.startTime)}
                                >
                                  <i className="fas fa-play"></i>
                                  Videoda Göster
                                </button>
                                <span className="interaction-date">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="researcher-container">
      <div className="header-with-back">
        <button onClick={() => navigate('/researcher-panel', { state: { email: researcherUser.email } })} className="back-button">
          <span className="ios-back">Geri</span>
        </button>
        <h1>Video Etkileşimleri</h1>
      </div>

      <div className="interactions-view">
        <div className="video-list">
          <div className="list-header">
            <h2>
              <i className="fas fa-film"></i>
              Videolarınız
            </h2>
            <span className="video-count">{videos.length} video</span>
          </div>
          {videos && videos.length > 0 ? (
            videos.map((video) => (
              <div
                key={video.trackingId}
                className={`video-item ${selectedVideo?.trackingId === video.trackingId ? 'selected' : ''}`}
                onClick={() => handleVideoSelect(video)}
              >
                <h3>{video.title}</h3>
                <small>
                  <i className="far fa-calendar-alt"></i>
                  {new Date(video.createdAt).toLocaleDateString()}
                </small>
              </div>
            ))
          ) : (
            <p className="no-videos">
              <i className="fas fa-film"></i>
              Henüz video bulunmuyor
            </p>
          )}
        </div>

        <div className="interactions-detail">
          {selectedVideo ? (
            <>
              <div className="video-header">
                <div className="video-title">
                  <h2>{selectedVideo.title}</h2>
                  <button 
                    onClick={() => {
                      const studentUrl = `http://localhost:3000/watch/${selectedVideo.trackingId}`;
                      navigator.clipboard.writeText(studentUrl);
                      toast.success('Video linki kopyalandı. Öğrenciler ile paylaşabilirsiniz');
                    }} 
                    className="video-url"
                  >
                    <i className="fas fa-share-alt"></i>
                    Videoyu Paylaş
                  </button>
                  <button 
                    onClick={exportToExcel} 
                    className="video-url export-btn"
                  >
                    <i className="fas fa-file-excel"></i>
                    Excel'e Aktar
                  </button>
                </div>
                <div className="video-stats">
                  <span className="stat">
                    <i className="fas fa-users"></i>
                    {interactions.length} kullanıcı
                  </span>
                  <span className="stat">
                    <i className="fas fa-mouse-pointer"></i>
                    {interactions.reduce((total, interaction) => total + (interaction.interactions?.length || 0), 0)} etkileşim
                  </span>
                </div>
              </div>
              {interactions && interactions.length > 0 ? (
                <>
                  <div className="video-statistics">
                    <h3>
                      <i className="fas fa-chart-bar"></i>
                      Video İstatistikleri
                    </h3>
                    {(() => {
                      const stats = calculateVideoStatistics(interactions);
                      if (!stats) return null;

                      const [startTime, endTime] = stats.mostReplayedRange.range.split('-');
                      
                      return (
                        <div className="stats-grid">
                          <div className="stat-card">
                            <i className="fas fa-clock"></i>
                            <div className="stat-info">
                              <h4>Toplam İzlenme Süresi</h4>
                              <p>
                                {formatDuration(stats.totalVideoWatchTime)}
                              </p>
                            </div>
                          </div>

                          <div className="stat-card">
                            <i className="fas fa-undo"></i>
                            <div className="stat-info">
                              <h4>En Çok Tekrar İzlenen Kısım</h4>
                              {stats.mostReplayedRange.range ? (
                                <div>
                                  <p>
                                    {formatDuration(endTime)} - {formatDuration(startTime)}
                                    <small>{stats.mostReplayedRange.count} kez tekrar edildi</small>
                                  </p>
                                  <button 
                                    className="show-in-video small"
                                    onClick={() => handleShowInVideo(parseFloat(endTime))}
                                  >
                                    <i className="fas fa-play"></i>
                                    Videoda Göster
                                  </button>
                                </div>
                              ) : (
                                <p className="no-data">
                                  <i className="fas fa-info-circle"></i>
                                  Henüz yeterli veri yok
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="stat-card">
                            <i className="fas fa-mouse-pointer"></i>
                            <div className="stat-info">
                              <h4>Etkileşim Detayları</h4>
                              <p>
                                ⏸️ Durdurma: {stats.interactionCounts.pause || 0}<br />
                                ⏩ İleri Sarma: {stats.interactionCounts.forward || 0}<br />
                                ⏪ Geri Sarma: {stats.interactionCounts.rewind || 0}<br />
                                🔄 Tekrar İzleme: {stats.interactionCounts.replay || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="interactions-by-user">
                    {selectedVideo && interactions.length > 0 ? (
                      <>
                        <div className="search-container">
                          <div className="search-box">
                            <i className="fas fa-search"></i>
                            <input
                              type="text"
                              placeholder="Öğrenci ara..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="search-input"
                            />
                            {searchTerm && (
                              <button 
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                          <div className="search-stats">
                            <span>{filteredInteractions.length} öğrenci gösteriliyor</span>
                          </div>
                        </div>
                        {renderUserInteractions(filteredInteractions)}
                      </>
                    ) : (
                      <div className="no-interactions">
                        <i className="fas fa-info-circle"></i>
                        <p>Bu video için henüz etkileşim bulunmuyor</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-interactions">
                  <i className="fas fa-info-circle"></i>
                  <p>Bu video için henüz etkileşim bulunmuyor</p>
                </div>
              )}
            </>
          ) : (
            <div className="select-prompt">
              <i className="fas fa-hand-point-left"></i>
              <p>Lütfen etkileşimlerini görmek istediğiniz videoyu seçin</p>
            </div>
          )}
        </div>
      </div>
      {showVideoPopup && selectedVideo && (
        <VideoPopup
          videoUrl={selectedVideo.videoUrl}
          startTime={selectedTime}
          onClose={() => {
            setShowVideoPopup(false);
            setSelectedTime(null);
          }}
        />
      )}
    </div>
  );
}

export default ViewInteractions; 
