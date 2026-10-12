import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PRINT DOCKER | BADAM SUDHEER REDDY',
    short_name: 'PRINT DOCKER',
    description: 'PRINT DOCKER - Smart Online Printing Management System. Upload PDFs, track orders live, and get real-time updates.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#2D63FF',
    icons: [
      {
        src: '/icon.png',
        sizes: '458x458',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
