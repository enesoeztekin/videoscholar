import React, { useState, useRef } from 'react';
import axios from 'axios';

const VideoUploader = ({ onVideoUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndUploadVideo(file);
    }
  };

  const handleUpload = async (file) => {
    setUploadProgress(0);
    const thumbnailUrl = URL.createObjectURL(file);
    setThumbnailUrl(thumbnailUrl);
    onVideoUploaded(null, file, thumbnailUrl);
  };

  const handleVideoSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      validateAndUploadVideo(file);
    }
  };

  const validateAndUploadVideo = (file) => {
    if (!file.type.startsWith('video/')) {
      setError('Lütfen geçerli bir video dosyası seçin');
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB
      setError('Video dosyası 500MB\'dan küçük olmalıdır');
      return;
    }

    setSelectedVideo(file);
    setError('');
    handleUpload(file);
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      // Video yüklendikten sonra ilk kareyi göster
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="video-uploader">
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {thumbnailUrl ? (
          <div className="thumbnail">
            <video 
              ref={videoRef}
              src={thumbnailUrl}
              onLoadedData={handleVideoLoad}
              controls={false}
            />
          </div>
        ) : (
          <div className="upload-prompt">
            <i className="fas fa-cloud-upload-alt"></i>
            <p>Video yüklemek için tıklayın veya sürükleyin</p>
            <small>Maksimum dosya boyutu: 500MB</small>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleVideoSelect}
          accept="video/*"
          style={{ display: 'none' }}
        />
      </div>

      {uploadProgress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${uploadProgress}%` }}
          >
            <span>{uploadProgress}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
    </div>
  );
};

export default VideoUploader; 