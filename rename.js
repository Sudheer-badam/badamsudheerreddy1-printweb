const fs = require('fs');
const files = [
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/auth/register/page.tsx',
  'src/app/dashboard/layout.tsx',
  'src/app/dashboard/orders/[id]/page.tsx',
  'src/app/auth/login/page.tsx',
  'src/app/admin/layout.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/Sudheer Reddy Print/g, 'PRINT DOCKER | BADAM SUDHEER REDDY');
    content = content.replace(/BADAMSUDHEERREDDY\.jpg/g, 'logo.png');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
