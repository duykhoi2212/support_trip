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

// Response Interceptor: Chuẩn hóa bắt lỗi tiếng Việt & xử lý phiên hết hạn / tài khoản bị khóa
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
    const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const status = error.response?.status;
    const reqUrl: string = error.config?.url || '';

    if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (error.message === 'Network Error') {
      message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';
    }

    // Tự động đăng xuất nếu token hết hạn (401) hoặc tài khoản vừa bị Admin khóa nóng (403)
    const isAuthEndpoint = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register');
    const isAccountLocked =
      errorCode === 'ACCOUNT_LOCKED_PERMANENT' || errorCode === 'ACCOUNT_LOCKED_TEMPORARY';

    if (!isAuthEndpoint && (status === 401 || (status === 403 && isAccountLocked))) {
      if (localStorage.getItem('auth_token')) {
        localStorage.removeItem('auth_token');
        window.dispatchEvent(
          new CustomEvent('gox:force-logout', {
            detail: { reason: message },
          })
        );
      }
    }

    const enhancedError = new Error(message);
    (enhancedError as any).code = errorCode;
    (enhancedError as any).status = status;
    (enhancedError as any).details = error.response?.data?.error?.details;

    return Promise.reject(enhancedError);
  }
);

