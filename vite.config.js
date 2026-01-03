import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        categories: 'categories.html',
        category: 'category.html',
        contact: 'contact.html',
        post: 'post.html'
      }
    }
  }
});
