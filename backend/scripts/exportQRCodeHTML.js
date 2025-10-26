const mongoose = require('mongoose');
const Mess = require('../src/models/Mess');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportQRCodeHTML(messCode) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB');

    const mess = await Mess.findOne({ code: messCode, deleted_at: null });

    if (!mess) {
      console.error(`Mess with code ${messCode} not found`);
      process.exit(1);
    }

    if (!mess.qr_code) {
      console.error(`QR code not found for ${messCode}. Run generateQRCodes.js first.`);
      process.exit(1);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mess.name} - QR Code</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 600px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 2em;
    }
    .mess-code {
      color: #667eea;
      font-weight: bold;
      font-size: 1.2em;
      margin-bottom: 30px;
    }
    .qr-wrapper {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      display: inline-block;
    }
    .qr-code {
      border: 3px solid #667eea;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 30px;
      text-align: left;
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
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 1.1em;
      color: #333;
      font-weight: 600;
    }
    .instructions {
      margin-top: 30px;
      padding: 20px;
      background: #fff3cd;
      border-radius: 10px;
      border-left: 4px solid #ffc107;
    }
    .instructions h3 {
      color: #856404;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .instructions ol {
      text-align: left;
      color: #856404;
      padding-left: 20px;
      line-height: 1.8;
    }
    @media print {
      body {
        background: white;
      }
      .instructions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${mess.name}</h1>
    <div class="mess-code">${mess.code}</div>

    <div class="qr-wrapper">
      <img src="${mess.qr_code}" alt="Mess QR Code" class="qr-code" width="400" height="400">
    </div>

    <div class="info-grid">
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

    <div class="instructions">
      <h3>📱 How to Use This QR Code:</h3>
      <ol>
        <li>Open the mess app on your phone</li>
        <li>Go to "QR Scanner" section</li>
        <li>Enable location services</li>
        <li>Be within ${mess.radius_meters}m of the mess location</li>
        <li>Scan this QR code</li>
        <li>Your attendance will be marked automatically!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    const outputPath = path.join(__dirname, '../../', `${messCode}-QR-CODE.html`);
    fs.writeFileSync(outputPath, html);

    console.log(`\n✅ QR Code HTML file created successfully!`);
    console.log(`📁 Location: ${outputPath}`);
    console.log(`\n🌐 Open this file in your browser to see the QR code`);
    console.log(`🖨️  You can also print it directly from the browser`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const messCode = process.argv[2] || 'MESS-A';
exportQRCodeHTML(messCode);
