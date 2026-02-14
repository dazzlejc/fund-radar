import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { fetchBenchmarkHistory, fetchFundHistory } from '../services/fundService';

const PERIOD_OPTIONS = [
  { value: '1m', label: '近1月' },
  { value: '3m', label: '近3月' },
  { value: '1y', label: '近1年' }
];

const BENCHMARK_OPTIONS = [
  { code: '000300', label: '沪深300' },
  { code: '000016', label: '上证50' },
  { code: '000905', label: '中证500' },
  { code: '000852', label: '中证1000' },
  { code: '399006', label: '创业板指' }
];

const fundHistoryCache = new Map();
const benchmarkHistoryCache = new Map();

const toSafeNumber = (value) => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const formatPercent = (value) => {
  const num = toSafeNumber(value);
  if (!Number.isFinite(num)) return '--';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

const normalizeDate = (value) => String(value || '').slice(0, 10);

const sanitizeFunds = (funds) => {
  const normalized = (funds || [])
    .map((fund) => {
      const amount = toSafeNumber(fund.amount);
      const costPrice = toSafeNumber(fund.costPrice);
      const code = String(fund.code || '').trim();
      if (!/^\d{6}$/.test(code)) return null;
      if (!Number.isFinite(amount) || amount <= 0) return null;
      if (!Number.isFinite(costPrice) || costPrice <= 0) return null;
      return {
        code,
        amount,
        costPrice
      };
    })
    .filter(Boolean);

  const deduped = new Map();
  normalized.forEach((item) => {
    deduped.set(item.code, item);
  });

  return Array.from(deduped.values()).sort((a, b) => a.code.localeCompare(b.code));
};

const getFundHistoryCached = (fundCode, period) => {
  const key = `${fundCode}_${period}`;
  if (!fundHistoryCache.has(key)) {
    const pending = fetchFundHistory(fundCode, period).catch((error) => {
      fundHistoryCache.delete(key);
      throw error;
    });
    fundHistoryCache.set(key, pending);
  }
  return fundHistoryCache.get(key);
};

const getBenchmarkHistoryCached = (benchmarkCode, period) => {
  const key = `${benchmarkCode}_${period}`;
  if (!benchmarkHistoryCache.has(key)) {
    const pending = fetchBenchmarkHistory(benchmarkCode, period).catch((error) => {
      benchmarkHistoryCache.delete(key);
      throw error;
    });
    benchmarkHistoryCache.set(key, pending);
  }
  return benchmarkHistoryCache.get(key);
};

const buildPortfolioSeries = (funds, fundHistories) => {
  const totalInvested = funds.reduce((sum, fund) => sum + fund.amount, 0);
  if (!Number.isFinite(totalInvested) || totalInvested <= 0) return [];

  const seriesByCode = new Map();
  const allDates = new Set();

  funds.forEach((fund) => {
    const rawHistory = fundHistories.get(fund.code) || [];
    const history = rawHistory
      .map((item) => {
        const date = normalizeDate(item.date);
        const netValue = toSafeNumber(item.netValue);
        if (!date || !Number.isFinite(netValue) || netValue <= 0) return null;
        return {
          date,
          ratio: netValue / fund.costPrice
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!history.length) return;

    seriesByCode.set(fund.code, history);
    history.forEach((point) => allDates.add(point.date));
  });

  const sortedDates = Array.from(allDates).sort();
  if (!sortedDates.length) return [];

  const cursorByCode = new Map();
  const lastRatioByCode = new Map();
  funds.forEach((fund) => cursorByCode.set(fund.code, 0));

  return sortedDates
    .map((date) => {
      let portfolioValue = 0;

      funds.forEach((fund) => {
        const history = seriesByCode.get(fund.code);
        if (!history || history.length === 0) {
          portfolioValue += fund.amount;
          return;
        }

        let cursor = cursorByCode.get(fund.code) || 0;
        while (cursor < history.length && history[cursor].date <= date) {
          lastRatioByCode.set(fund.code, history[cursor].ratio);
          cursor += 1;
        }
        cursorByCode.set(fund.code, cursor);

        const ratio = lastRatioByCode.get(fund.code) ?? 1;
        portfolioValue += fund.amount * ratio;
      });

      const portfolioReturn = ((portfolioValue / totalInvested) - 1) * 100;
      return {
        date,
        portfolioReturn
      };
    })
    .filter((item) => Number.isFinite(item.portfolioReturn));
};

const buildBenchmarkSeries = (history) => {
  const points = (history || [])
    .map((item) => {
      const date = normalizeDate(item.date);
      const close = toSafeNumber(item.close);
      if (!date || !Number.isFinite(close) || close <= 0) return null;
      return { date, close };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!points.length) return [];
  const base = points[0].close;
  if (!Number.isFinite(base) || base <= 0) return [];

  return points.map((point) => ({
    date: point.date,
    benchmarkReturn: ((point.close / base) - 1) * 100
  }));
};

const mergeSeries = (portfolioSeries, benchmarkSeries) => {
  const portfolioMap = new Map((portfolioSeries || []).map((item) => [item.date, item.portfolioReturn]));
  const benchmarkMap = new Map((benchmarkSeries || []).map((item) => [item.date, item.benchmarkReturn]));
  const allDates = new Set([...portfolioMap.keys(), ...benchmarkMap.keys()]);
  const sortedDates = Array.from(allDates).sort();

  let lastPortfolio = null;
  let lastBenchmark = null;

  return sortedDates
    .map((date) => {
      if (portfolioMap.has(date)) {
        lastPortfolio = portfolioMap.get(date);
      }
      if (benchmarkMap.has(date)) {
        lastBenchmark = benchmarkMap.get(date);
      }

      const hasPortfolio = Number.isFinite(lastPortfolio);
      const hasBenchmark = Number.isFinite(lastBenchmark);
      if (!hasPortfolio && !hasBenchmark) return null;

      return {
        date,
        portfolioReturn: hasPortfolio ? lastPortfolio : null,
        benchmarkReturn: hasBenchmark ? lastBenchmark : null,
        excessReturn: hasPortfolio && hasBenchmark ? lastPortfolio - lastBenchmark : null
      };
    })
    .filter(Boolean);
};

function PerformanceComparisonChart({ funds }) {
  const [period, setPeriod] = useState('3m');
  const [benchmarkCode, setBenchmarkCode] = useState('000300');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trackedFunds = useMemo(() => sanitizeFunds(funds), [funds]);
  const trackedSignature = useMemo(
    () => trackedFunds.map((fund) => `${fund.code}:${fund.amount}:${fund.costPrice}`).join('|'),
    [trackedFunds]
  );

  const selectedBenchmarkLabel = useMemo(
    () => BENCHMARK_OPTIONS.find((item) => item.code === benchmarkCode)?.label || benchmarkCode,
    [benchmarkCode]
  );

  useEffect(() => {
    let canceled = false;

    const loadComparison = async () => {
      if (!trackedFunds.length) {
        setLoading(false);
        setChartData([]);
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [fundResults, benchmarkResult] = await Promise.all([
          Promise.allSettled(
            trackedFunds.map(async (fund) => ({
              code: fund.code,
              history: await getFundHistoryCached(fund.code, period)
            }))
          ),
          getBenchmarkHistoryCached(benchmarkCode, period)
        ]);

        if (canceled) return;

        const fundHistories = new Map();
        fundResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            fundHistories.set(result.value.code, result.value.history);
          }
        });

        const portfolioSeries = buildPortfolioSeries(trackedFunds, fundHistories);
        const benchmarkSeries = buildBenchmarkSeries(benchmarkResult);
        const merged = mergeSeries(portfolioSeries, benchmarkSeries);

        setChartData(merged);
        if (!merged.length) {
          setError('暂无可用于对比的历史数据');
        }
      } catch (loadError) {
        console.error('Failed to load performance comparison:', loadError);
        if (!canceled) {
          setChartData([]);
          setError('收益率对比加载失败');
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadComparison();
    return () => {
      canceled = true;
    };
  }, [benchmarkCode, period, trackedSignature]);

  const latest = useMemo(() => {
    if (!chartData.length) return null;
    return chartData[chartData.length - 1];
  }, [chartData]);

  const excessClass = useMemo(() => {
    if (!Number.isFinite(latest?.excessReturn)) return '';
    return latest.excessReturn >= 0 ? 'positive' : 'negative';
  }, [latest]);

  return (
    <aside className="comparison-card" aria-label="收益率对比图">
      <div className="comparison-header">
        <div>
          <p className="comparison-kicker">收益率曲线</p>
          <h2 className="comparison-title">组合 vs {selectedBenchmarkLabel}</h2>
          <p className={`comparison-excess ${excessClass}`}>
            {Number.isFinite(latest?.excessReturn) ? `当前超额 ${formatPercent(latest.excessReturn)}` : '等待历史数据'}
          </p>
        </div>

        <div className="comparison-controls">
          <select
            className="comparison-select"
            value={benchmarkCode}
            onChange={(event) => setBenchmarkCode(event.target.value)}
            aria-label="选择对比指数"
          >
            {BENCHMARK_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="period-selector">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`period-button ${period === option.value ? 'active' : ''}`}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="comparison-legend">
        <span className="legend-item">
          <i className="legend-dot portfolio" />
          我的组合
        </span>
        <span className="legend-item">
          <i className="legend-dot benchmark" />
          {selectedBenchmarkLabel}
        </span>
      </div>

      <div className="comparison-chart">
        {!trackedFunds.length ? (
          <div className="comparison-empty">先设置持有金额和已有持有收益，再查看收益率曲线</div>
        ) : loading ? (
          <div className="comparison-loading">加载收益率对比中...</div>
        ) : error ? (
          <div className="comparison-empty">{error}</div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 44, 67, 0.12)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(18, 43, 63, 0.68)', fontSize: 11 }}
                tickFormatter={(value) => {
                  const parts = String(value).split('-');
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(18, 43, 63, 0.68)', fontSize: 11 }}
                tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(15, 44, 67, 0.15)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(15, 44, 67, 0.12)'
                }}
                formatter={(value, key) => {
                  if (key === 'portfolioReturn') return [formatPercent(value), '我的组合'];
                  if (key === 'benchmarkReturn') return [formatPercent(value), selectedBenchmarkLabel];
                  if (key === 'excessReturn') return [formatPercent(value), '超额收益'];
                  return [value, key];
                }}
                labelFormatter={(label) => `日期 ${label}`}
              />
              <Line
                type="monotone"
                dataKey="portfolioReturn"
                stroke="#c3412f"
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="benchmarkReturn"
                stroke="#0f8f9a"
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </aside>
  );
}

export default PerformanceComparisonChart;
