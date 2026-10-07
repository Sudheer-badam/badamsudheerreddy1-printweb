const fs = require('fs');
const files = [
  'src/app/dashboard/upload/page.tsx',
  'src/app/admin/orders/page.tsx',
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/className="bg-gray-900 text-white"/g, 'className="bg-white text-[#0B1D3A]"');
    content = content.replace(/className="bg-gray-900"/g, 'className="bg-white text-[#0B1D3A]"');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
