const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processImage() {
  const inputPath = 'Screenshot 2026-10-07 095206.png';
  const outputPath = 'src/app/icon.png';

  try {
    const metadata = await sharp(inputPath).metadata();
    
    // We assume the image is roughly square based on the screenshot, but let's use the smaller dimension.
    const size = Math.min(metadata.width, metadata.height);

    // Create a circular SVG mask
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
      </svg>`
    );

    await sharp(inputPath)
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: circleSvg,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);

    console.log("Successfully created circular icon.png!");
  } catch (err) {
    console.error("Error cropping image:", err);
  }
}

processImage();
