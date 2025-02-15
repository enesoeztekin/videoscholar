const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();
const VideoInteraction = require('./models/VideoInteraction');
const VideoTracking = require('./models/VideoTracking');
const Researcher = require('./models/Researcher');
const Student = require('./models/Student');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();

// AWS S3 yapılandırması
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Multer ayarları - memory storage kullan
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Sadece video dosyaları yüklenebilir!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Middleware
app.use(cors({
  origin: "https://videoscholar-dh4g.vercel.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar için klasör tanımlama
app.use('/storage', express.static(path.join(__dirname, 'storage')));

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Video yükleme endpoint'i
app.post('/api/upload', async (req, res) => {
  try {
    upload.single('video')(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Dosya boyutu çok büyük (maksimum 500MB)' });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Video dosyası bulunamadı' });
      }

      // Araştırmacı email'inden klasör adını oluştur
      const researcherEmail = req.body.researcherEmail;
      const folderName = researcherEmail.split('@')[0];
      
      // Benzersiz dosya adı oluştur
      const fileExtension = '.mp4';
      const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
      
      // S3'e yüklenecek dosya yapılandırması
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${folderName}/${fileName}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };

      // S3'e yükle
      const uploadResult = await s3.upload(uploadParams).promise();

      // Başarılı yanıt dön
      res.json({
        filename: fileName,
        videoUrl: uploadResult.Location,
        thumbnailUrl: uploadResult.Location
      });
    });
  } catch (error) {
    console.error('Video yükleme hatası:', error);
    res.status(500).json({ message: 'Video yüklenirken bir hata oluştu' });
  }
});

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Araştırmacının videolarını getir
app.get('/api/tracking/researcher/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const videos = await VideoTracking.find({ researcherEmail: email });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tracking ID'ye göre video bilgilerini getir
app.get('/api/tracking/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const videoTracking = await VideoTracking.findOne({ trackingId });
    
    if (!videoTracking) {
      return res.status(404).json({ message: 'Video tracking bulunamadı' });
    }
    
    res.json(videoTracking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Video tracking oluşturma
app.post('/api/tracking', async (req, res) => {
  try {
    const { videoUrl, title, description, researcherEmail } = req.body;
    
    // Benzersiz bir tracking ID oluştur
    const trackingId = crypto.randomBytes(8).toString('hex');
    
    const videoTracking = new VideoTracking({
      videoUrl,
      title,
      description,
      trackingId,
      researcherEmail
    });
    
    await videoTracking.save();
    res.status(201).json(videoTracking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni video etkileşimi oluştur
app.post('/api/interactions', async (req, res) => {
  try {
    const { videoUrl, trackingId, userId, type, startTime, endTime, comment } = req.body;
    
    let interaction = await VideoInteraction.findOne({ trackingId, userId });
    
    if (!interaction) {
      interaction = new VideoInteraction({
        videoUrl,
        trackingId,
        userId,
        interactions: []
      });
    }
    
    const newInteraction = {
      type,
      startTime,
      endTime,
      timestamp: new Date()
    };

    if (type === 'comment' && comment) {
      newInteraction.comment = {
        text: comment.text,
        videoTime: comment.videoTime
      };
    }
    
    interaction.interactions.push(newInteraction);
    
    await interaction.save();
    res.status(201).json(interaction);
  } catch (error) {
    console.error('Etkileşim kaydedilirken hata:', error);
    res.status(500).json({ message: error.message });
  }
});

// Bir video için tüm kullanıcıların etkileşimlerini getir
app.get('/api/interactions/tracking/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const interactions = await VideoInteraction.find({ trackingId });
    res.json(interactions || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kullanıcının video etkileşimlerini getir
app.get('/api/interactions/:trackingId/:userId', async (req, res) => {
  try {
    const { trackingId, userId } = req.params;
    const interaction = await VideoInteraction.findOne({ trackingId, userId });
    res.json(interaction || { interactions: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Video izleme süresi kaydetme endpoint'i
app.post('/api/interactions/watch-time', async (req, res) => {
  try {
    const { videoUrl, trackingId, userId, duration } = req.body;

    // VideoInteraction modelini güncelle
    const interaction = await VideoInteraction.findOneAndUpdate(
      { trackingId, userId },
      { 
        $inc: { totalWatchTime: duration },
        $setOnInsert: { videoUrl, trackingId, userId }
      },
      { upsert: true, new: true }
    );

    res.json(interaction);
  } catch (error) {
    console.error('İzleme süresi kaydedilirken hata:', error);
    res.status(500).json({ error: 'İzleme süresi kaydedilemedi' });
  }
});

// Araştırmacı kayıt endpoint'i
app.post('/api/researcher/register', async (req, res) => {
  try {
    const { email, password, name, institution } = req.body;

    // Email kontrolü
    const existingResearcher = await Researcher.findOne({ email });
    if (existingResearcher) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Yeni araştırmacı oluştur
    const researcher = new Researcher({
      email,
      password,
      name,
      institution
    });

    await researcher.save();

    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Araştırmacı giriş endpoint'i
app.post('/api/researcher/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Araştırmacıyı bul
    const researcher = await Researcher.findOne({ email });
    if (!researcher) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    // Şifreyi kontrol et
    const isMatch = await researcher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    res.json({
      message: 'Giriş başarılı',
      researcher: {
        email: researcher.email,
        name: researcher.name,
        institution: researcher.institution
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Öğrenci kayıt endpoint'i
app.post('/api/student/register', async (req, res) => {
  try {
    const { email, password, name, studentNumber, department } = req.body;

    // Email kontrolü
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Öğrenci numarası kontrolü
    const existingStudentNumber = await Student.findOne({ studentNumber });
    if (existingStudentNumber) {
      return res.status(400).json({ message: 'Bu öğrenci numarası zaten kayıtlı' });
    }

    // Yeni öğrenci oluştur
    const student = new Student({
      email,
      password,
      name,
      studentNumber,
      department
    });

    await student.save();

    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Öğrenci giriş endpoint'i
app.post('/api/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Öğrenciyi bul
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    // Şifreyi kontrol et
    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    res.json({
      message: 'Giriş başarılı',
      student: {
        email: student.email,
        name: student.name,
        studentNumber: student.studentNumber,
        department: student.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Video tracking silme endpoint'i
app.delete('/api/tracking/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Video tracking'i bul
    const videoTracking = await VideoTracking.findOne({ trackingId });
    if (!videoTracking) {
      return res.status(404).json({ message: 'Video bulunamadı' });
    }

    // Eğer video yerel sunucuda depolanıyorsa, dosyayı sil
    if (videoTracking.videoUrl.includes('localhost:5000/storage/videos/')) {
      const filename = videoTracking.videoUrl.split('/').pop();
      const filePath = path.join(__dirname, 'storage/videos', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // İlgili etkileşimleri sil
    await VideoInteraction.deleteMany({ trackingId });
    
    // Video tracking'i sil
    await VideoTracking.deleteOne({ trackingId });

    res.json({ message: 'Video başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 