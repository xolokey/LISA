// Connection test utility
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const API_BASE_URL = process.env['NODE_ENV'] === 'production' 
      ? 'https://your-api-domain.com/api' 
      : 'http://localhost:5000/api';
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('API connection test failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('API connection test successful:', data);
    return true;
  } catch (error) {
    console.error('API connection test error:', error);
    return false;
  }
};

// Run connection test on module load in development
if (process.env['NODE_ENV'] === 'development') {
  setTimeout(() => {
    testApiConnection().then(success => {
      if (success) {
        console.log('✅ Backend connection established successfully');
      } else {
        console.error('❌ Backend connection failed - check if server is running');
      }
    });
  }, 1000);
}