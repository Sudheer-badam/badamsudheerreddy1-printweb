import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://badamsudheerreddy1-printweb.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api/*', '/dashboard/*'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/logo.png', '/icon.png', '/logo_circular.png', '/*.png', '/*.jpg'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
