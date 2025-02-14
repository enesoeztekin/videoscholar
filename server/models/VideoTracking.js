const mongoose = require('mongoose');

const videoTrackingSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  trackingId: {
    type: String,
    required: true,
    unique: true
  },
  researcherEmail: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VideoTracking', videoTrackingSchema); 