import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động gắn Bearer Token nếu đã đăng nhập
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Chuẩn hóa bắt lỗi tiếng Việt
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

    if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (error.message === 'Network Error') {
      message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';
    }

    const enhancedError = new Error(message);
    (enhancedError as any).code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).details = error.response?.data?.error?.details;

    return Promise.reject(enhancedError);
  }
);

