import { Component } from 'react';

const toText = (value) => (typeof value === 'string' ? value : String(value || ''));

const isExtensionStack = (text) => /chrome-extension:\/\/|moz-extension:\/\//i.test(toText(text));

const shouldIgnoreExternalExtensionError = (error) => {
  const message = toText(error?.message || error);
  const stack = toText(error?.stack);
  const errorName = toText(error?.name || '');
  const errorString = toText(error?.toString() || '');

  // 检查消息或堆栈中是否包含扩展路径
  if (isExtensionStack(message) || isExtensionStack(stack)) {
    return true;
  }

  // 检查是否是钱包/区块链扩展相关的错误
  // 即使堆栈不包含扩展路径，只要消息包含钱包相关关键词，也忽略
  const walletKeywords = /metamask|backpack|ethereum|wallet|web3|blockchain|coinbase|phantom|trusty|polkadot|solana/i;
  if (walletKeywords.test(message) || walletKeywords.test(errorName) || walletKeywords.test(errorString)) {
    return true;
  }

  // 检查特定的错误消息模式
  const commonExtensionErrors = [
    /failed to connect to/i,
    /couldn't override/i,
    /injection failed/i,
    /provider.*error/i,
    /wallet.*not.*found/i,
    /account.*access/i
  ];
  
  if (commonExtensionErrors.some(pattern => pattern.test(message))) {
    return true;
  }

  return false;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    if (shouldIgnoreExternalExtensionError(error)) {
      return null;
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (shouldIgnoreExternalExtensionError(error)) {
      console.warn('Ignored extension runtime error:', error);
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
      return;
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <main className="error-boundary">
        <section className="error-content">
          <p className="error-tag">Runtime Error</p>
          <h1 className="error-title">Page Error</h1>
          <p className="error-message">Please try rerendering this page. If the issue persists, check console logs.</p>
          <div className="error-actions">
            <button type="button" className="button" onClick={this.handleReset}>
              Retry
            </button>
            <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
          {this.state.error && (
            <details className="error-details">
              <summary>View Error Details</summary>
              <pre className="error-stack">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
