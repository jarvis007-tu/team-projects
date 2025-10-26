const mongoose = require('mongoose');
const Mess = require('../src/models/Mess');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function generateSimpleQR(messCode) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB\n');

    const mess = await Mess.findOne({ code: messCode, deleted_at: null });

    if (!mess) {
      console.error(`Mess with code ${messCode} not found`);
      process.exit(1);
    }

    // Create simplified QR data for better scanning
    const qrData = {
      type: 'MESS_QR',
      mess_id: mess._id.toString(),
      name: mess.name,
      code: mess.code,
      latitude: mess.latitude,
      longitude: mess.longitude,
      radius_meters: mess.radius_meters,
      generated_at: new Date().toISOString()
    };

    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'dev-jwt-secret-key-2024')
      .update(JSON.stringify(qrData))
      .digest('hex');

    qrData.signature = signature;

    const qrString = JSON.stringify(qrData);
    console.log('QR Data:', qrString);
    console.log('QR Data Length:', qrString.length, 'characters\n');

    // Generate multiple versions for testing

    // 1. Ultra High Error Correction (Best for camera scanning)
    const qrHighEC = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H', // High = 30% recovery
      type: 'image/png',
      quality: 1,
      margin: 4, // More margin for better detection
      width: 500, // Larger size
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // 2. Print-friendly version (High contrast, larger)
    const qrPrint = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 6,
      width: 800,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create an enhanced HTML with multiple QR versions
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mess.name} - Enhanced QR Code</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0f0f0;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #667eea;
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 30px;
    }
    .qr-section {
      margin-bottom: 40px;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 15px;
      background: #fafafa;
    }
    .qr-title {
      font-size: 1.1em;
      font-weight: bold;
      color: #444;
      margin-bottom: 15px;
      text-align: center;
    }
    .qr-wrapper {
      background: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .qr-code {
      max-width: 100%;
      height: auto;
      border: 3px solid #667eea;
      border-radius: 10px;
    }
    .info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 30px;
    }
    .info-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    .info-label {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 1.1em;
      color: #333;
      font-weight: 600;
    }
    .tips {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 10px;
      padding: 20px;
      margin-top: 30px;
    }
    .tips h3 {
      color: #856404;
      margin-bottom: 15px;
    }
    .tips ul {
      color: #856404;
      padding-left: 20px;
      line-height: 2;
    }
    .tips li {
      margin-bottom: 8px;
    }
    @media print {
      body {
        background: white;
      }
      .tips {
        display: none;
      }
      .qr-section {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${mess.name}</h1>
    <div class="subtitle">${mess.code}</div>

    <!-- Version 1: Camera Scan Optimized -->
    <div class="qr-section">
      <div class="qr-title">📱 Camera Scan (Display on Screen)</div>
      <div class="qr-wrapper">
        <img src="${qrHighEC}" alt="Camera Scan QR Code" class="qr-code" style="width: 500px;">
      </div>
      <p style="text-align: center; margin-top: 15px; color: #666; font-size: 0.9em;">
        ⚡ Optimized for mobile camera scanning
      </p>
    </div>

    <!-- Version 2: Print Version -->
    <div class="qr-section">
      <div class="qr-title">🖨️ Print Version (Larger, Higher Quality)</div>
      <div class="qr-wrapper">
        <img src="${qrPrint}" alt="Print QR Code" class="qr-code" style="width: 100%; max-width: 600px;">
      </div>
      <p style="text-align: center; margin-top: 15px; color: #666; font-size: 0.9em;">
        📄 Print this for permanent display at mess entrance
      </p>
    </div>

    <div class="info">
      <div class="info-item">
        <div class="info-label">Location</div>
        <div class="info-value">${mess.latitude}, ${mess.longitude}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Radius</div>
        <div class="info-value">${mess.radius_meters} meters</div>
      </div>
      <div class="info-item">
        <div class="info-label">Address</div>
        <div class="info-value">${mess.address || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">City</div>
        <div class="info-value">${mess.city || 'N/A'}, ${mess.state || 'N/A'}</div>
      </div>
    </div>

    <div class="tips">
      <h3>📸 Camera Scanning Tips:</h3>
      <ul>
        <li><strong>Distance:</strong> Hold phone 15-25cm from screen</li>
        <li><strong>Angle:</strong> Tilt screen slightly (20-30°) to reduce glare</li>
        <li><strong>Brightness:</strong> Increase screen brightness to maximum</li>
        <li><strong>Lighting:</strong> Scan in a well-lit room</li>
        <li><strong>Steady:</strong> Keep both phone and screen still for 2-3 seconds</li>
        <li><strong>Focus:</strong> Tap on QR code on phone screen to force focus</li>
        <li><strong>Alternative:</strong> If camera fails, take a screenshot and use "Upload QR Image"</li>
        <li><strong>Best Option:</strong> Print this QR code for reliable scanning!</li>
      </ul>
    </div>

    <div class="tips" style="background: #d1ecf1; border-color: #0c5460; margin-top: 20px;">
      <h3 style="color: #0c5460;">💡 Why Camera Scanning Can Be Difficult:</h3>
      <ul style="color: #0c5460;">
        <li>QR codes on backlit screens create glare and reflections</li>
        <li>Phone cameras struggle to focus on bright screens</li>
        <li>Screen pixel density can interfere with QR pattern detection</li>
        <li><strong>Solution: Print the QR code or save it as an image to upload</strong></li>
      </ul>
    </div>
  </div>
</body>
</html>`;

    const outputPath = path.join(__dirname, '../../', `${messCode}-ENHANCED-QR.html`);
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Enhanced QR Code HTML created!`);
    console.log(`📁 Location: ${outputPath}`);
    console.log(`\n📱 Two versions included:`);
    console.log(`   1. Camera Scan (500px) - For displaying on screen`);
    console.log(`   2. Print Version (800px) - For printing`);
    console.log(`\n💡 Tip: Printing the QR code works MUCH better than scanning from screen!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const messCode = process.argv[2] || 'MESS-A';
generateSimpleQR(messCode);
