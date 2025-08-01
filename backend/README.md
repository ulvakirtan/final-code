# Campus Safety Alert System Backend
Backend for campus safety alert system, Node.js/Express/MongoDB Atlas

## Structure

backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── student.js
│   │   ├── complaint.js
│   │   ├── image.js
│   │   └── alert.js
│   ├── middlewares/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── register.js
│   │   ├── student.js
│   │   ├── complaints.js
│   │   ├── qr.js
│   │   ├── image.js
│   │   ├── face.js
│   │   └── alerts.js
│   ├── utils/
│   │   ├── qrGenerator.js
│   │   └── faceRecognition.js
├── uploads/
│   ├── (profile & live images)
├── package.json
└── .env.example

