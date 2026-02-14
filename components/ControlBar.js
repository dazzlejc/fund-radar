import { memo, useMemo } from 'react';
import { SORT_LABELS, SORT_OPTIONS } from '../constants/config';
import { safeSum, safeDivide } from '../utils/decimalUtils';

function ControlBar({
  activeTab,
  onTabChange,
  funds,
  countdown,
  onRefresh,
  loading,
  showSettings,
  onToggleSettings,
  refreshInterval,
  onIntervalChange,
  sortBy,
  onSortChange
}) {
  const summary = useMemo(() => {
    // 确保数据有效性，过滤掉无效金额
    const selected = funds.filter((fund) => Number.isFinite(Number.parseFloat(fund.amount)));
    const totalAssets = safeSum(selected.map((fund) => Number.parseFloat(fund.amount) || 0));
    const dailyProfit = safeSum(selected.map((fund) => Number.parseFloat(fund.dailyProfit) || 0));
    const totalProfit = safeSum(selected.map((fund) => Number.parseFloat(fund.totalProfit) || 0));
    const holdingReturnRate = totalAssets > 0 ? safeDivide(totalProfit, totalAssets) * 100 : null;
    return { totalAssets, dailyProfit, totalProfit, holdingReturnRate };
  }, [funds]);

  const favoriteCount = funds.filter((fund) => fund.isFavorite).length;

  return (
    <>
      <section className="control-panel">
        {summary.totalAssets > 0 && (
          <div className="summary-strip">
            <div className="summary-item">
              <span className="summary-label">总资产</span>
              <strong className="summary-value">
                ¥{summary.totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">当日收益</span>
              <strong className={`summary-value ${summary.dailyProfit >= 0 ? 'positive' : 'negative'}`}>
                {summary.dailyProfit >= 0 ? '+' : ''}¥{summary.dailyProfit.toFixed(2)}
              </strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">累计收益</span>
              <strong className={`summary-value ${summary.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {summary.totalProfit >= 0 ? '+' : ''}¥{summary.totalProfit.toFixed(2)}
              </strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">持有收益率</span>
              <strong
                className={`summary-value ${
                  Number.isFinite(summary.holdingReturnRate)
                    ? (summary.holdingReturnRate >= 0 ? 'positive' : 'negative')
                    : ''
                }`}
              >
                {Number.isFinite(summary.holdingReturnRate)
                  ? `${summary.holdingReturnRate > 0 ? '+' : ''}${summary.holdingReturnRate.toFixed(2)}%`
                  : '--'}
              </strong>
            </div>
          </div>
        )}

        <div className="control-main">
          <div className="tab-container" role="tablist" aria-label="基金视图切换">
            <button
              type="button"
              className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => onTabChange('all')}
              role="tab"
              aria-selected={activeTab === 'all'}
            >
              全部基金
              <span className="tab-count">{funds.length}</span>
            </button>
            <button
              type="button"
              className={`tab-item ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => onTabChange('favorites')}
              role="tab"
              aria-selected={activeTab === 'favorites'}
            >
              自选基金
              <span className="tab-count">{favoriteCount}</span>
            </button>
          </div>

          <div className="refresh-controls">
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="sort-select"
              title="排序方式"
              aria-label="排序方式"
            >
              <option value={SORT_OPTIONS.CHANGE_DESC}>{SORT_LABELS[SORT_OPTIONS.CHANGE_DESC]}</option>
              <option value={SORT_OPTIONS.CHANGE_ASC}>{SORT_LABELS[SORT_OPTIONS.CHANGE_ASC]}</option>
              <option value={SORT_OPTIONS.CODE_ASC}>{SORT_LABELS[SORT_OPTIONS.CODE_ASC]}</option>
              <option value={SORT_OPTIONS.CODE_DESC}>{SORT_LABELS[SORT_OPTIONS.CODE_DESC]}</option>
              <option value={SORT_OPTIONS.NAME_ASC}>{SORT_LABELS[SORT_OPTIONS.NAME_ASC]}</option>
              <option value={SORT_OPTIONS.NAME_DESC}>{SORT_LABELS[SORT_OPTIONS.NAME_DESC]}</option>
            </select>

            <span className="countdown-text">下次刷新 {Math.max(0, countdown)} 秒</span>

            <button
              type="button"
              onClick={onRefresh}
              className={`button refresh-button ${loading ? 'loading' : ''}`}
              disabled={loading}
              title="立即刷新"
              aria-label="立即刷新"
            >
              <svg 
                className={`refresh-icon ${loading ? 'spinning' : ''}`} 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>

            <button
              type="button"
              onClick={onToggleSettings}
              className="button button-secondary"
              title="设置"
              aria-label="打开设置"
            >
              设置
            </button>
          </div>
        </div>
      </section>

      {showSettings && (
        <section className="settings-panel">
          <div className="settings-content">
            <label htmlFor="refresh-interval" className="settings-label">
              自动刷新间隔（秒）
            </label>
            <input
              id="refresh-interval"
              type="number"
              min="5"
              max="300"
              value={refreshInterval}
              onChange={(event) => onIntervalChange(event.target.value)}
              className="input settings-input"
            />
          </div>
        </section>
      )}
    </>
  );
}

export default memo(ControlBar);