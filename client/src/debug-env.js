// Debug script to check environment variables
console.log('=== Environment Variables Debug ===');
console.log('VITE_CLIENT_ID:', import.meta.env.VITE_CLIENT_ID);
console.log('VITE_TENANT_ID:', import.meta.env.VITE_TENANT_ID);
console.log('VITE_REDIRECT_URI:', import.meta.env.VITE_REDIRECT_URI);
console.log('VITE_DEBUG:', import.meta.env.VITE_DEBUG);
console.log('NODE_ENV:', import.meta.env.NODE_ENV);
console.log('MODE:', import.meta.env.MODE);
console.log('BASE_URL:', import.meta.env.BASE_URL);
console.log('===================================');

export default function debugEnv() {
  return {
    clientId: import.meta.env.VITE_CLIENT_ID,
    tenantId: import.meta.env.VITE_TENANT_ID,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
    debug: import.meta.env.VITE_DEBUG,
    nodeEnv: import.meta.env.NODE_ENV,
    mode: import.meta.env.MODE,
    baseUrl: import.meta.env.BASE_URL
  };
} 