const mongoose = require('mongoose');
const Mess = require('../src/models/Mess');
const QRCode = require('qrcode');
const crypto = require('crypto');
require('dotenv').config();

async function generateMessQRCode(mess) {
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

  const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 1,
    margin: 1,
    width: 400
  });

  return {
    qr_code: qrCodeDataURL,
    qr_data: qrData
  };
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_mess_db');
    console.log('Connected to MongoDB');

    const messes = await Mess.find({ deleted_at: null });
    console.log(`Found ${messes.length} messes\n`);

    const forceRegenerate = process.argv.includes('--force');

    for (const mess of messes) {
      if (!mess.qr_code || forceRegenerate) {
        console.log(`${forceRegenerate ? 'Regenerating' : 'Generating'} QR code for: ${mess.name} (${mess.code})`);
        const qrCodeData = await generateMessQRCode(mess);
        mess.qr_code = qrCodeData.qr_code;
        mess.qr_data = qrCodeData.qr_data;
        await mess.save();
        console.log(`✅ ${forceRegenerate ? 'Regenerated' : 'Generated'} for ${mess.name}\n`);
      } else {
        console.log(`✓ QR already exists for ${mess.name} (${mess.code})\n`);
      }
    }

    console.log('Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
