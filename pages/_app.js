import '../styles/globals.css';
import '../styles/toast.css';
import '../styles/error-boundary.css';
import '../styles/sector-chart.css';
import { ToastProvider } from '../components/Toast';
import ErrorBoundary from '../components/ErrorBoundary';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 注册Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker 注册成功:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker 注册失败:', error);
          });
      });
    }

    // 忽略浏览器扩展（特别是钱包扩展）的未处理 Promise rejection
    const handleUnhandledRejection = (event) => {
      const error = event.reason;
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || '';
      
      // 检查是否是扩展相关的错误
      const isExtensionError = 
        /chrome-extension:|moz-extension:/i.test(errorStack) ||
        /metamask|backpack|ethereum|wallet|web3|blockchain|coinbase|phantom|trusty|polkadot|solana/i.test(errorMessage) ||
        /failed to connect to|couldn't override|injection failed|provider.*error/i.test(errorMessage);
      
      if (isExtensionError) {
        event.preventDefault();
        console.warn('Ignored extension unhandled rejection:', error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </ErrorBoundary>
  );
}