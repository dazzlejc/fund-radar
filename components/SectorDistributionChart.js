import { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { safeSum } from '../utils/decimalUtils';
import { resolveFundSectorTag } from '../utils/fundLabels';

const SECTOR_COLORS = [
  '#1976d2', // 上证50 - 蓝色
  '#43a047', // 沪深300 - 绿色
  '#7e57c2', // 中证500 - 紫色
  '#f57c00', // 中证1000 - 橙色
  '#e53935', // 创业板 - 红色
  '#0097a7', // 科创 - 青色
  '#f06292', // 红利 - 粉红
  '#8e24aa', // 医疗 - 紫红
  '#ffb300', // 消费 - 琥珀
  '#c0ca33', // 新能源 - 黄绿
  '#5d4037', // 半导体 - 棕色
  '#37474f', // 军工 - 深灰
  '#0277bd', // 金融 - 深蓝
  '#f9a825', // 黄金 - 金色
  '#00897b', // 港股 - 蓝绿
  '#1565c0', // 美股 - 深蓝
  '#757575', // 其他 - 灰色
  '#9e9e9e', // 债券 - 浅灰
  '#bdbdbd', // 货币 - 更浅
  '#616161', // 指数 - 暗灰
  '#424242', // 股票 - 更暗
  '#212121'  // 混合 - 最暗
];

function SectorDistributionChart({ funds }) {
  const sectorData = useMemo(() => {
    const sectorMap = new Map();

    // 按行业分组
    funds.forEach((fund) => {
      if (!fund.isFavorite) return;

      const amount = Number.parseFloat(fund.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const sector = resolveFundSectorTag(fund);
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + amount);
    });

    // 转换为数组并排序
    const data = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const total = safeSum(data.map((d) => d.value));

    return data.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [funds]);

  const totalAssets = safeSum(sectorData.map((d) => d.value));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          border: '1px solid rgba(15, 44, 67, 0.15)',
          borderRadius: '10px',
          padding: '12px',
          boxShadow: '0 8px 24px rgba(15, 44, 67, 0.12)',
          fontSize: '13px'
        }}
      >
        <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#122f43' }}>
          {data.name}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#2c3e50' }}>
          金额: ¥{data.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ margin: 0, color: '#2c3e50' }}>
          占比: {data.percentage.toFixed(2)}%
        </p>
      </div>
    );
  };

  if (!sectorData.length) {
    return (
      <aside className="sector-card" aria-label="行业分布">
        <div className="sector-header">
          <p className="sector-kicker">持仓分布</p>
          <h2 className="sector-title">行业配置</h2>
          <p className="sector-empty">添加自选基金并设置持仓金额后查看分布</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sector-card" aria-label="行业分布">
      <div className="sector-header">
        <p className="sector-kicker">持仓分布</p>
        <h2 className="sector-title">行业配置</h2>
        <p className="sector-total">总资产 ¥{totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</p>
      </div>

      <div className="sector-content">
        <div className="sector-chart">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                labelLine={false}
                label={(entry) => (entry.percentage >= 5 ? `${entry.percentage.toFixed(1)}%` : '')}
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="sector-legend">
          {sectorData.map((entry, index) => (
            <div key={entry.name} className="sector-legend-item">
              <span
                className="sector-legend-color"
                style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
              />
              <span className="sector-legend-name">{entry.name}</span>
              <span className="sector-legend-value">
                ¥{entry.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </span>
              <span className="sector-legend-percent">{entry.percentage.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default SectorDistributionChart;
