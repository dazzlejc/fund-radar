import { memo, useMemo } from 'react';
import { safeSum, safeDivide } from '../utils/decimalUtils';

/**
 * 悬浮核心数据面板 - PC端侧边栏固定显示
 */
function StickySummary({ funds, countdown }) {
  const summary = useMemo(() => {
    const favorites = funds.filter((fund) => fund.isFavorite);
    const tracked = favorites.filter((fund) => Number.parseFloat(fund.amount) > 0);

    if (!tracked.length) {
      return {
        favoriteCount: favorites.length,
        totalAssets: 0,
        dailyProfit: 0,
        totalProfit: 0,
        holdingReturnRate: 0
      };
    }

    const totalAssets = safeSum(tracked.map((fund) => Number.parseFloat(fund.amount) || 0));
    const dailyProfit = safeSum(tracked.map((fund) => Number.parseFloat(fund.dailyProfit) || 0));
    const totalProfit = safeSum(tracked.map((fund) => Number.parseFloat(fund.totalProfit) || 0));
    const holdingReturnRate = totalAssets > 0 ? safeDivide(totalProfit, totalAssets) * 100 : 0;

    return {
      favoriteCount: favorites.length,
      totalAssets,
      dailyProfit,
      totalProfit,
      holdingReturnRate
    };
  }, [funds]);

  // 只在有追踪数据时显示
  if (summary.favoriteCount === 0) {
    return null;
  }

  return (
    <aside className="sticky-summary" aria-label="悬浮核心数据">
      <div className="sticky-summary-content">
        <div className="sticky-summary-header">
          <p className="sticky-summary-kicker">实时概览</p>
          <p className="sticky-summary-subtitle">自选基金 {summary.favoriteCount} 个</p>
        </div>

        <div className="sticky-summary-metrics">
          <div className="sticky-metric">
            <span className="sticky-metric-label">总资产</span>
            <span className="sticky-metric-value">
              ¥{summary.totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="sticky-metric">
            <span className="sticky-metric-label">当日收益</span>
            <span
              className={`sticky-metric-value ${
                summary.dailyProfit >= 0 ? 'metric-positive' : 'metric-negative'
              }`}
            >
              {summary.dailyProfit >= 0 ? '+' : ''}¥{summary.dailyProfit.toFixed(2)}
            </span>
          </div>

          <div className="sticky-metric">
            <span className="sticky-metric-label">累计收益</span>
            <span
              className={`sticky-metric-value ${
                summary.totalProfit >= 0 ? 'metric-positive' : 'metric-negative'
              }`}
            >
              {summary.totalProfit >= 0 ? '+' : ''}¥{summary.totalProfit.toFixed(2)}
            </span>
          </div>

          <div className="sticky-metric">
            <span className="sticky-metric-label">收益率</span>
            <span
              className={`sticky-metric-value ${
                summary.holdingReturnRate >= 0 ? 'metric-positive' : 'metric-negative'
              }`}
            >
              {summary.holdingReturnRate >= 0 ? '+' : ''}
              {summary.holdingReturnRate.toFixed(2)}%
            </span>
          </div>
        </div>

        {countdown !== undefined && (
          <div className="sticky-summary-countdown">
            <span className="countdown-text">刷新倒计时</span>
            <span className="countdown-value">{Math.max(0, countdown)}s</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(StickySummary);
