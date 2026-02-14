import { useState, useCallback, useEffect, useRef } from 'react';
import { searchFunds } from '../services/fundService';
import { API_CONFIG } from '../constants/config';

function FundSearch({ onSelect }) {
  const inputRef = useRef(null);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const performSearch = useCallback(async (value) => {
    const text = value.trim();
    if (!text) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const funds = await searchFunds(text);
      setResults(funds.slice(0, API_CONFIG.MAX_SEARCH_RESULTS));
      setShowResults(true);
    } catch (error) {
      console.error('搜索失败:', error);
      setResults([]);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 监听 Ctrl+K 或 Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // 监听 '/' 键 (当输入框未聚焦时)
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(keyword);
    }, API_CONFIG.SEARCH_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [keyword, performSearch]);

  const handleSelect = (fund) => {
    onSelect(fund);
    setKeyword('');
    setResults([]);
    setShowResults(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && /^\d{6}$/.test(keyword.trim())) {
      event.preventDefault();
      onSelect(keyword.trim());
      setKeyword('');
      setResults([]);
      setShowResults(false);
    }
  };

  return (
    <div className="fund-search">
      <div className="search-input-shell">
        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入基金代码或名称 (快捷键 / 或 Ctrl+K)"
          className="search-input input"
          autoComplete="off"
        />
      </div>

      {showResults && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">搜索中...</div>
          ) : results.length > 0 ? (
            results.map((fund) => (
              <button
                type="button"
                key={fund.CODE}
                className="search-result-item"
                onClick={() => handleSelect(fund)}
              >
                <span className="result-code">{fund.CODE}</span>
                <span className="result-name">{fund.NAME || fund.SHORTNAME}</span>
              </button>
            ))
          ) : (
            <div className="search-empty">未找到匹配基金</div>
          )}
        </div>
      )}
    </div>
  );
}

export default FundSearch;

