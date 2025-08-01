const express = require('express');
const multer = require('multer');
const Image = require('../models/image');
const Student = require('../models/student');
const auth = require('../middlewares/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Setup multer for storing images (to backend/uploads/)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload (or replace) student profile image
router.post('/profile', auth(), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No file uploaded.' });

  let imgRecord = await Image.findOneAndUpdate(
    { studentId: req.user.id },
    { imgPath: req.file.path },
    { upsert: true, new: true }
  );
  // Update student record with the new image document's id
  await Student.findByIdAndUpdate(req.user.id, { imageId: imgRecord._id });

  res.json({ msg: 'Profile image uploaded.', image: imgRecord });
});

// Get image by imageId (for verification)
router.get('/:imageId', async (req, res) => {
  const image = await Image.findById(req.params.imageId);
  if (!image) return res.status(404).json({ msg: 'Image not found' });
  res.sendFile(path.resolve(image.imgPath));
});

module.exports = router;

