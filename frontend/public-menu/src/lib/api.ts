import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const publicApi = axios.create({
  baseURL: `${API_URL}/api/v1/public`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;
