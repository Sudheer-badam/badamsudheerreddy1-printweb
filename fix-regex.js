const fs = require('fs');

const files = [
  'src/app/admin/page.tsx',
  'src/app/admin/customers/page.tsx',
  'src/app/admin/orders/page.tsx',
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/replace\(\/\\\\D\/g/g, "replace(/\\D/g");
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
