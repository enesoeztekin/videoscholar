const mongoose = require('mongoose');

const videoInteractionSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true
  },
  trackingId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  totalWatchTime: { type: Number, default: 0 }, // Toplam izleme süresi (saniye)
  interactions: [{
    type: {
      type: String,
      enum: ['pause', 'rewind', 'forward', 'comment', 'comment-step', 'replay'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    startTime: {
      type: Number,  // Video başlangıç saniyesi
      required: true
    },
    endTime: {
      type: Number,  // Video bitiş saniyesi (pause için startTime ile aynı olacak)
      required: true
    },
    comment: {
      text: String,
      videoTime: Number
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('VideoInteraction', videoInteractionSchema); 