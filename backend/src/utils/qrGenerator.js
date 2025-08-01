const QRCode = require('qrcode');

async function generateQRCode(data) {
  // returns a Data URL for QR
  return QRCode.toDataURL(data);
}

module.exports = { generateQRCode };
