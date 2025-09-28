import { bundle } from '@adminjs/bundler';
import componentLoader from './component-loader.js';

(async () => {
  try {
    console.log('Bundling AdminJS components...');
    const files = await bundle({
      componentLoader,
      destinationDir: './.adminjs',
    });
    console.log('AdminJS bundling completed successfully');
    console.log('Generated files:', files);
  } catch (error) {
    console.error('AdminJS bundling failed:', error);
    process.exit(1);
  }
})();
