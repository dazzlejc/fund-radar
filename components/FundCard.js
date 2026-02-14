import { memo, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMarketStatusTag, resolveFundSectorTag } from '../utils/fundLabels';

const FundChart = dynamic(() => import('./FundChart'), {
  ssr: false,
  loading: () => <div className="chart-loading">加载走势图中...</div>
});

function formatMoney(value) {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return '--';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return '--';
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function formatSignedMoney(value) {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return '--';
  return `${num >= 0 ? '+' : ''}¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FundCard({
  fund,
  onRemove,
  onToggleFavorite,
  onToggleExpand,
  onToggleChart,
  onAmountChange,
  onExistingProfitChange,
  onSetAmountEdit,
  onSetExistingProfitEdit
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const changeValue = Number.parseFloat(fund.gszzl);
  const isUp = Number.isFinite(changeValue) && changeValue > 0;
  const isDown = Number.isFinite(changeValue) && changeValue < 0;
  const isFlat = Number.isFinite(changeValue) && changeValue === 0;
  const statusClass = isUp ? 'status-up' : isDown ? 'status-down' : isFlat ? 'status-flat' : '';
  const holdingReturnRateNum = Number.parseFloat(fund.holdingReturnRate);
  const holdingRateClass = Number.isFinite(holdingReturnRateNum)
    ? (holdingReturnRateNum >= 0 ? 'positive' : 'negative')
    : '';
  const hasAmount = Number.isFinite(Number.parseFloat(fund.amount));

  const marketStatus = useMemo(() => getMarketStatusTag(), [fund.lastUpdate, fund.gztime]);
  const sectorTag = useMemo(() => resolveFundSectorTag(fund), [fund.name, fund.fundType]);

  const lastUpdateText = useMemo(() => {
    if (!fund.lastUpdate) return '';
    try {
      return new Date(fund.lastUpdate).toLocaleTimeString('zh-CN', { hour12: false });
    } catch {
      return '';
    }
  }, [fund.lastUpdate]);

  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      onRemove();
    } else {
      setIsConfirmingDelete(true);
      // 3秒后如果没有确认，自动恢复
      setTimeout(() => setIsConfirmingDelete(false), 3000);
    }
  };

  return (
    <article className={`fund-card ${statusClass}`}>
      <header className="fund-card-header">
        <div className="fund-info">
          <h3 className="fund-name">{fund.name}</h3>
          <p className="fund-code">{fund.code}</p>
          <div className="fund-tags">
            <span className={`fund-tag fund-tag-status ${marketStatus.tone}`}>{marketStatus.label}</span>
            <span className="fund-tag fund-tag-sector">{sectorTag}</span>
            {fund.fundType ? <span className="fund-tag fund-tag-type">{fund.fundType}</span> : null}
          </div>
        </div>
        <div className="fund-actions">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`icon-button ${fund.isFavorite ? 'active' : ''}`}
            title={fund.isFavorite ? '取消自选' : '加入自选'}
            aria-label={fund.isFavorite ? '取消自选' : '加入自选'}
          >
            ★
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className={`icon-button danger ${isConfirmingDelete ? 'confirm-state' : ''}`}
            title={isConfirmingDelete ? '点击确认删除' : '删除基金'}
            aria-label={isConfirmingDelete ? '确认删除' : '删除基金'}
          >
            {isConfirmingDelete ? '确认?' : '×'}
          </button>
        </div>
      </header>

      <div className="fund-data">
        <div className="data-row">
          <span className="data-label">{fund.noValuation ? '最新净值' : '实时估值'}</span>
          <span className="data-value">{fund.gsz || fund.dwjz || '--'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">涨跌幅</span>
          <span className={`data-value change-value ${isUp ? 'text-up' : ''} ${isDown ? 'text-down' : ''} ${isFlat ? 'text-flat' : ''}`}>
            {formatPercent(fund.gszzl)}
          </span>
        </div>

        <div className="fund-meta-wrap mobile-hidden">
          {fund.jzrq && <span className="fund-meta">净值日期 {fund.jzrq}</span>}
          {fund.gztime && <span className="fund-meta">估值时间 {fund.gztime}</span>}
          {lastUpdateText && <span className="fund-meta">刷新时间 {lastUpdateText}</span>}
        </div>
      </div>

      <div className="fund-holdings">
        <div className="holdings-row">
          <span className="data-label">持仓金额</span>
          {fund.showAmountEdit ? (
            <input
              type="number"
              className="amount-input"
              value={fund.amount ?? ''}
              onChange={(event) => onAmountChange(fund.code, event.target.value)}
              onBlur={() => onSetAmountEdit(fund.code, false)}
              placeholder="输入金额"
              min="0"
              step="0.01"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="text-button amount-value"
              onClick={() => onSetAmountEdit(fund.code, true)}
              title="点击编辑持仓金额"
            >
              {Number.isFinite(Number.parseFloat(fund.amount)) ? formatMoney(fund.amount) : '点击设置'}
            </button>
          )}
        </div>

        <div className="data-row">
          <span className="data-label">已有持有收益</span>
          {fund.showExistingProfitEdit ? (
            <input
              type="number"
              className="price-input"
              value={fund.existingProfit ?? ''}
              onChange={(event) => onExistingProfitChange(fund.code, event.target.value)}
              onBlur={() => onSetExistingProfitEdit(fund.code, false)}
              placeholder="输入累计收益金额"
              step="0.01"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="text-button amount-value"
              onClick={() => onSetExistingProfitEdit(fund.code, true)}
              title="点击设置已有持有收益"
            >
              {Number.isFinite(Number.parseFloat(fund.existingProfit))
                ? formatSignedMoney(fund.existingProfit)
                : '点击设置'}
            </button>
          )}
        </div>

        {hasAmount && (
          <>
            <div className="data-row">
              <span className="data-label">当日收益</span>
              <span className={`data-value profit-value ${fund.dailyProfit >= 0 ? 'positive' : 'negative'}`}>
                {fund.dailyProfit >= 0 ? '+' : ''}¥{fund.dailyProfit.toFixed(2)}
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">累计收益</span>
              <span className={`data-value profit-value ${fund.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {fund.totalProfit >= 0 ? '+' : ''}¥{fund.totalProfit.toFixed(2)}
              </span>
            </div>

            <div className="data-row">
              <span className="data-label">持有收益率</span>
              <span className={`data-value profit-value ${holdingRateClass}`}>
                {formatPercent(fund.holdingReturnRate)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="action-buttons">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`button button-secondary favorite-button ${fund.isFavorite ? 'active' : ''}`}
        >
          {fund.isFavorite ? '移出自选' : '加入自选'}
        </button>
        <button type="button" onClick={onToggleExpand} className="button toggle-button">
          {fund.expanded ? '收起重仓股' : '查看重仓股'}
        </button>
        <button type="button" onClick={() => onToggleChart(fund.code)} className="button button-secondary">
          {fund.chartExpanded ? '收起走势图' : '查看走势图'}
        </button>
      </div>

      {fund.chartExpanded && <FundChart fundCode={fund.code} fundName={fund.name} />}

      <div className={`collapsible-content ${fund.expanded ? 'expanded' : ''}`}>
        {fund.holdings && fund.holdings.length > 0 ? (
          <div className="holdings-container">
            <table className="stock-table">
              <thead>
                <tr>
                  <th style={{ width: '44px' }}>序号</th>
                  <th>股票名称</th>
                  <th>最新价</th>
                  <th>涨跌幅</th>
                  <th>持仓占比</th>
                </tr>
              </thead>
              <tbody>
                {fund.holdings.map((stock, index) => {
                  const stockIsUp = Number.parseFloat(stock.change) > 0;
                  const stockIsDown = Number.parseFloat(stock.change) < 0;

                  return (
                    <tr key={stock.code || `${fund.code}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{stock.name || '--'}</td>
                      <td className="stock-price">
                        {Number.isFinite(Number.parseFloat(stock.price))
                          ? Number.parseFloat(stock.price).toFixed(2)
                          : '--'}
                      </td>
                      <td className={`stock-change ${stockIsUp ? 'up' : ''} ${stockIsDown ? 'down' : ''}`}>
                        {formatPercent(stock.change)}
                      </td>
                      <td>{stock.weight || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : fund.expanded && fund.holdingsLoaded ? (
          <div className="empty-holdings">暂无重仓股数据</div>
        ) : fund.expanded ? (
          <div className="loading-holdings">加载中...</div>
        ) : null}
      </div>
    </article>
  );
}

export default memo(FundCard);
