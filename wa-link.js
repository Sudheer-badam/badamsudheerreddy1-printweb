const fs = require('fs');

const files = [
  'src/app/admin/page.tsx',
  'src/app/admin/customers/page.tsx',
  'src/app/admin/orders/page.tsx',
];

const waLink = (phoneStr) => {
  return `<a href={\`https://wa.me/\${(${phoneStr} || "").replace(/\\D/g, '')}\`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-green-500 hover:underline cursor-pointer flex items-center gap-1">`;
}

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    if (file.includes('admin/page.tsx')) {
      content = content.replace(
        /<div className="text-sm text-gray-600">\{stats\.mostActiveCustomer\.phone\}<\/div>/g,
        `<div className="text-sm text-gray-600">${waLink('stats.mostActiveCustomer.phone')}{stats.mostActiveCustomer.phone}</a></div>`
      );
      content = content.replace(
        /<div className="text-xs text-gray-500">\{order\.user\.phone\}<\/div>/g,
        `<div className="text-xs text-gray-500">${waLink('order.user.phone')}{order.user.phone}</a></div>`
      );
    }
    
    if (file.includes('admin/customers/page.tsx')) {
      content = content.replace(
        /<Phone className="w-3\.5 h-3\.5" \/>\n\s*<span>\{customer\.phone \|\| "—"\}<\/span>/g,
        `${waLink('customer.phone')}<Phone className="w-3.5 h-3.5" /> <span>{customer.phone || "—"}</span></a>`
      );
      content = content.replace(
        /<Phone className="w-3\.5 h-3\.5" \/>\s*<span>\{customer\.phone \|\| "—"\}<\/span>/g,
        `${waLink('customer.phone')}<Phone className="w-3.5 h-3.5" /> <span>{customer.phone || "—"}</span></a>`
      );
    }

    if (file.includes('admin/orders/page.tsx')) {
      // Fix InfoRow signature
      content = content.replace(
        /function InfoRow\(\{ label, value \}: \{ label: string; value: string \}\) \{/g,
        `function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {`
      );

      content = content.replace(
        /<Phone className="w-3 h-3" \/> \{order\.user\.phone\}/g,
        `${waLink('order.user.phone')}<Phone className="w-3 h-3" /> {order.user.phone}</a>`
      );
      
      content = content.replace(
        /<InfoRow label="Phone" value=\{selectedOrder\.user\.phone\} \/>/g,
        `<InfoRow label="Phone" value={<>{${waLink('selectedOrder.user.phone')}}{selectedOrder.user.phone}</a></>} />`
      );
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
