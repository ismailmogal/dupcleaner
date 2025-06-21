import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-msal': ['@azure/msal-browser'],
          
          // Feature chunks
          'duplicate-detection': [
            './src/utils/duplicateDetector.jsx',
            './src/utils/duplicateDetectorWorker.js'
          ],
          'components-core': [
            './src/components/DuplicateManager.jsx',
            './src/components/FileBrowser.jsx',
            './src/components/FolderSelector.jsx'
          ],
          'components-advanced': [
            './src/components/MultiFolderDuplicateManager.jsx',
            './src/components/SmartOrganizer.jsx',
            './src/components/CollaborativeManager.jsx',
            './src/components/AITestRunner.jsx'
          ],
          'components-ui': [
            './src/components/ThemeToggle.jsx',
            './src/components/UserPreferences.jsx',
            './src/components/ErrorBoundary.jsx',
            './src/components/AnalyticsConsent.jsx'
          ],
          'utils': [
            './src/utils/aiDuplicateDetector.jsx',
            './src/utils/aiTestSuite.jsx',
            './src/utils/realFileTestData.jsx'
          ]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    sourcemap: mode === 'analyze', // Enable sourcemaps only for analysis
    target: 'es2015' // Target modern browsers
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@azure/msal-browser'
    ],
    exclude: [
      // Exclude large dependencies that should be loaded dynamically
    ]
  },
  // Bundle analysis configuration
  ...(mode === 'analyze' && {
    plugins: [
      react(),
      {
        name: 'bundle-analyzer',
        generateBundle(options, bundle) {
          console.log('\n📊 Bundle Analysis:');
          console.log('==================');
          
          let totalSize = 0;
          const chunks = [];
          
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk') {
              const size = chunk.code.length;
              totalSize += size;
              chunks.push({
                name: fileName,
                size: size,
                sizeKB: (size / 1024).toFixed(2)
              });
            }
          }
          
          // Sort by size (largest first)
          chunks.sort((a, b) => b.size - a.size);
          
          chunks.forEach(chunk => {
            const percentage = ((chunk.size / totalSize) * 100).toFixed(1);
            console.log(`${chunk.name}: ${chunk.sizeKB} KB (${percentage}%)`);
          });
          
          console.log(`\nTotal Bundle Size: ${(totalSize / 1024).toFixed(2)} KB`);
          console.log(`Gzipped (estimated): ${(totalSize / 1024 * 0.3).toFixed(2)} KB`);
        }
      }
    ]
  })
})); 