const faceapi = require('face-api.js');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let loaded = false;

async function loadModels() {
  if (loaded) return;
  try {
    const MODEL_PATH = path.join(__dirname, '../../models');
    
    // Load face-api.js models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    
    loaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    throw error;
  }
}

async function loadImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      throw new Error('No face detected in image');
    }
    
    return detection;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

async function compareFaces(referencePath, livePath) {
  try {
    await loadModels();
    
    const referenceDetection = await loadImage(referencePath);
    const liveDetection = await loadImage(livePath);
    
    const distance = faceapi.euclideanDistance(
      referenceDetection.descriptor,
      liveDetection.descriptor
    );
    
    const threshold = 0.6; // Lower is more strict matching
    const match = distance < threshold;
    const confidence = Math.max(0, (1 - distance) * 100); // Convert to percentage
    
    return {
      success: true,
      match,
      distance,
      confidence: Math.round(confidence * 100) / 100,
      threshold
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      match: false,
      confidence: 0
    };
  }
}

// Function to detect and analyze face mismatch patterns
async function analyzeFailedAttempts(userId, attempts) {
  const suspiciousThreshold = 3; // Number of failed attempts within time window
  const timeWindow = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  const recentAttempts = attempts.filter(attempt => 
    Date.now() - attempt.timestamp.getTime() < timeWindow
  );
  
  return {
    isSuspicious: recentAttempts.length >= suspiciousThreshold,
    attemptCount: recentAttempts.length,
    timeWindow: timeWindow / (60 * 1000), // Convert to minutes
    lastAttempt: attempts[attempts.length - 1]
  };
}

module.exports = { 
  compareFaces, 
  loadModels, 
  analyzeFailedAttempts 
};

