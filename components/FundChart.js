import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { fetchFundHistory } from '../services/fundService';

const PERIOD_LABELS = {
  '1d': '当日',
  '5d': '近5日',
  '1m': '近1月',
  '3m': '近3月',
  '1y': '近1年',
  '3y': '近3年'
};

function FundChart({ fundCode, fundName }) {
  const [period, setPeriod] = useState('1m');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const history = await fetchFundHistory(fundCode, period);
        if (canceled) return;
        const formatted = history
          .map((item) => ({
            date: item.date,
            value: Number.parseFloat(item.netValue) || 0,
            accumulated: Number.parseFloat(item.accumulatedValue) || 0,
            growth: Number.parseFloat(item.dailyGrowth) || 0
          }))
          .filter((item) => item.value > 0);
        setChartData(formatted);
      } catch (error) {
        if (!canceled) {
          console.error('加载历史数据失败:', error);
          setChartData([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      canceled = true;
    };
  }, [fundCode, period]);

  const chartRange = useMemo(() => {
    if (!chartData.length) return { min: 0, max: 1 };
    const values = chartData.map((item) => item.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = Math.max(maxValue - minValue, minValue * 0.01);
    const padding = span * 0.15;
    return {
      min: Math.max(0, minValue - padding),
      max: maxValue + padding
    };
  }, [chartData]);

  const gradientId = useMemo(() => `fund-chart-${fundCode}`, [fundCode]);

  return (
    <div className="fund-chart">
      <div className="chart-header">
        <h3 className="chart-title">{fundName} 走势图</h3>
        <div className="period-selector">
          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`period-button ${period === value ? 'active' : ''}`}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        {loading ? (
          <div className="chart-loading">加载中...</div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty">暂无历史数据</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f8f9a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0f8f9a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 44, 67, 0.12)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(18, 43, 63, 0.68)', fontSize: 11 }}
                tickFormatter={(value) => {
                  const parts = value.split('-');
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(18, 43, 63, 0.68)', fontSize: 11 }}
                domain={[chartRange.min, chartRange.max]}
                tickFormatter={(value) => value.toFixed(3)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(15, 44, 67, 0.15)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(15, 44, 67, 0.12)'
                }}
                formatter={(value, key) => {
                  if (key === 'value') return [Number(value).toFixed(4), '单位净值'];
                  if (key === 'accumulated') return [Number(value).toFixed(4), '累计净值'];
                  if (key === 'growth') return [`${Number(value).toFixed(2)}%`, '日涨跌幅'];
                  return [value, key];
                }}
                labelFormatter={(label) => `日期 ${label}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0f8f9a"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default FundChart;

