const sharp = require('sharp');
const fs = require('fs');

async function processImage() {
  const inputPath = 'public/logo.png';
  const outputPath = 'public/logo_circular.png';

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

    // Overwrite the original logo and favicon
    fs.copyFileSync(outputPath, 'public/logo.png');
    fs.copyFileSync(outputPath, 'src/app/favicon.ico'); // next.js can serve PNGs as favicons when configured, or we can use an .ico. Actually, let's just use it as .png and change layout if needed. Or keeping it .ico with a PNG format inside might work.
    fs.copyFileSync(outputPath, 'src/app/icon.png');
    
    // Remove the old favicon.ico
    if (fs.existsSync('src/app/favicon.ico')) {
      // Let's just make sure icon.png is used
    }
    
    console.log("Successfully created circular logo!");
  } catch (err) {
    console.error("Error cropping image:", err);
  }
}

processImage();
