import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import FundCard from '../components/FundCard';
import ControlBar from '../components/ControlBar';
import FundSearch from '../components/FundSearch';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/SkeletonCard';
import { fetchFundRealtime, fetchFundHoldings, fetchBatchStockQuotes } from '../services/fundService';
import { batchProcess } from '../utils/requestLimiter';
import { safeSum, safeDivide, safeMultiply } from '../utils/decimalUtils';
import { API_CONFIG, SORT_OPTIONS, STORAGE_KEYS, UI_CONFIG, DATA_VERSION } from '../constants/config';

const PerformanceComparisonChart = dynamic(() => import('../components/PerformanceComparisonChart'), {
  ssr: false,
  loading: () => <div className="comparison-loading">加载收益率曲线中...</div>
});

const SectorDistributionChart = dynamic(() => import('../components/SectorDistributionChart'), {
  ssr: false,
  loading: () => <div className="sector-loading">加载行业分布中...</div>
});

// 初始加载时显示骨架屏数量
const SKELETON_COUNT = 3;

const isLikelyCodeAsPrice = (price, stockCode) => {
  const code = String(stockCode || '').trim();
  const codeNum = Number.parseInt(code, 10);
  const priceNum = Number.parseFloat(price);

  if (!/^\d{6}$/.test(code)) return false;
  if (!Number.isFinite(codeNum) || !Number.isFinite(priceNum)) return false;

  return Math.abs(priceNum - codeNum) < 0.000001;
};

const sanitizeStockPrice = (price, stockCode) => {
  const num = Number.parseFloat(price);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (isLikelyCodeAsPrice(num, stockCode)) return null;
  return num;
};

const deriveCostPriceFromProfit = (amount, existingProfit, currentPrice) => {
  const safeAmount = Number.parseFloat(amount);
  const safeProfit = Number.parseFloat(existingProfit);
  const safeCurrentPrice = Number.parseFloat(currentPrice);

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return null;
  if (!Number.isFinite(safeProfit)) return null;
  if (!Number.isFinite(safeCurrentPrice) || safeCurrentPrice <= 0) return null;

  // 使用安全除法计算收益率（全链路使用 decimal.js-light）
  const profitRatio = safeDivide(safeProfit, safeAmount);
  
  // 使用安全加法计算比率基数（避免原生 1 + x 运算）
  const ratioBase = safeSum([1, profitRatio]);
  
  if (!Number.isFinite(ratioBase) || ratioBase <= 0) return null;

  // 使用安全除法反推成本价（避免原生 / 运算）
  const derived = safeDivide(safeCurrentPrice, ratioBase);
  return Number.isFinite(derived) && derived > 0 ? derived : null;
};

const normalizeFund = (fund) => ({
  code: String(fund?.code || '').trim(),
  name: fund?.name || `基金(${fund?.code || ''})`,
  isFavorite: Boolean(fund?.isFavorite),
  expanded: Boolean(fund?.expanded),
  holdingsLoaded: Boolean(fund?.holdingsLoaded),
  holdings: Array.isArray(fund?.holdings)
    ? fund.holdings.map((stock) => ({
        ...stock,
        price: sanitizeStockPrice(stock?.price, stock?.code)
      }))
    : [],
  lastUpdate: fund?.lastUpdate || null,
  lastHoldingsUpdate: fund?.lastHoldingsUpdate || null, // 添加重仓股最后更新时间
  amount: fund?.amount === '' || fund?.amount === undefined ? null : fund.amount,
  existingProfit:
    fund?.existingProfit === '' || fund?.existingProfit === undefined
      ? (Number.isFinite(Number.parseFloat(fund?.totalProfit)) ? Number.parseFloat(fund.totalProfit) : null)
      : fund.existingProfit,
  costPrice: fund?.costPrice === '' || fund?.costPrice === undefined ? null : fund.costPrice,
  dailyProfit: Number.parseFloat(fund?.dailyProfit) || 0,
  totalProfit: Number.parseFloat(fund?.totalProfit) || 0,
  holdingReturnRate: Number.isFinite(Number.parseFloat(fund?.holdingReturnRate))
    ? Number.parseFloat(fund.holdingReturnRate)
    : null,
  showAmountEdit: Boolean(fund?.showAmountEdit),
  showExistingProfitEdit: Boolean(fund?.showExistingProfitEdit),
  chartExpanded: Boolean(fund?.chartExpanded),
  dwjz: fund?.dwjz ?? null,
  gsz: fund?.gsz ?? null,
  gztime: fund?.gztime ?? null,
  jzrq: fund?.jzrq ?? null,
  gszzl: fund?.gszzl ?? null,
  noValuation: Boolean(fund?.noValuation),
  fundType: fund?.fundType ?? null
});

const recalculateProfit = (fund) => {
  const normalized = normalizeFund(fund);
  const amount = Number.parseFloat(normalized.amount);
  const existingProfit = Number.parseFloat(normalized.existingProfit);
  const costPrice = Number.parseFloat(normalized.costPrice);
  const currentPrice = Number.parseFloat(normalized.gsz);
  const changePercent = Number.parseFloat(normalized.gszzl);

  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeChangePercent = Number.isFinite(changePercent) ? changePercent : 0;

  // 使用安全乘法计算当日收益
  const dailyProfit = safeMultiply(safeAmount, safeDivide(safeChangePercent, 100));

  const effectiveCostPrice =
    Number.isFinite(costPrice) && costPrice > 0
      ? costPrice
      : deriveCostPriceFromProfit(safeAmount, existingProfit, currentPrice);

  let totalProfit = 0;
  let holdingReturnRate = null;
  if (
    safeAmount > 0 &&
    Number.isFinite(effectiveCostPrice) &&
    effectiveCostPrice > 0 &&
    Number.isFinite(currentPrice) &&
    currentPrice > 0
  ) {
    const ratio = safeDivide(currentPrice, effectiveCostPrice) - 1;
    totalProfit = safeMultiply(safeAmount, ratio);
    holdingReturnRate = ratio * 100;
  }

  return {
    ...normalized,
    costPrice: Number.isFinite(effectiveCostPrice) ? effectiveCostPrice : null,
    dailyProfit,
    totalProfit,
    holdingReturnRate
  };
};

const mergeRealtimeFund = (fund, realtime) =>
  recalculateProfit({
    ...fund,
    ...realtime,
    holdings: fund.holdings,
    holdingsLoaded: fund.holdingsLoaded,
    expanded: fund.expanded,
    isFavorite: fund.isFavorite,
    amount: fund.amount,
    existingProfit: fund.existingProfit,
    costPrice: fund.costPrice,
    showAmountEdit: fund.showAmountEdit,
    showExistingProfitEdit: fund.showExistingProfitEdit,
    chartExpanded: fund.chartExpanded,
    lastUpdate: Date.now()
  });

// 定义主题切换图标
const SunIcon = () => (
  <svg className="icon-theme" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg className="icon-theme" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function Home() {
  const { success, error: showError } = useToast();

  const [funds, setFfunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(UI_CONFIG.DEFAULT_REFRESH_INTERVAL);
  const [countdown, setCountdown] = useState(UI_CONFIG.DEFAULT_REFRESH_INTERVAL);
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.CHANGE_DESC);
  const [favoriteSetup, setFavoriteSetup] = useState(null);
  const [theme, setTheme] = useState('light');

  const refreshingRef = useRef(false);
  const countdownRef = useRef(refreshInterval); // 使用ref存储倒计时，避免每秒触发重渲染

  const applyTheme = useCallback((nextTheme, persist = true) => {
    const resolved = nextTheme === 'dark' ? 'dark' : 'light';
    setTheme(resolved);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, resolved);
      } catch (err) {
        console.error('保存主题设置失败:', err);
      }
    }
  }, []);

  const saveUserData = useCallback(
    (newFfunds, interval = refreshInterval) => {
      try {
        localStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify({
            watchList: newFfunds.map(normalizeFund),
            refreshInterval: interval
          })
        );
      } catch (err) {
        console.error('保存用户数据失败:', err);
      }
    },
    [refreshInterval]
  );

  const loadUserData = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);

      // 版本迁移逻辑
      const savedVersion = parsed?.version || '1.0.0';
      if (savedVersion !== DATA_VERSION) {
        console.log(`检测到数据版本变更: ${savedVersion} -> ${DATA_VERSION}`);
        // 这里可以添加版本特定的迁移逻辑
        // 例如：重命名字段、修复数据格式等
      }

      const watchList = Array.isArray(parsed?.watchList) ? parsed.watchList.map((fund) => {
        // 数据规范化 - 处理可能的字段变更
        const normalized = { ...fund };

        // 向后兼容：如果缺少字段，提供默认值
        if (normalized.dwjz === undefined && normalized.netValue !== undefined) {
          normalized.dwjz = normalized.netValue || null;
        }

        return recalculateProfit(normalized);
      }) : [];

      const savedInterval = Number.parseInt(parsed?.refreshInterval, 10);
      const interval = Number.isFinite(savedInterval)
        ? Math.max(UI_CONFIG.MIN_REFRESH_INTERVAL, Math.min(UI_CONFIG.MAX_REFRESH_INTERVAL, savedInterval))
        : UI_CONFIG.DEFAULT_REFRESH_INTERVAL;

      setFfunds(watchList);
      setRefreshInterval(interval);
      setCountdown(interval);
    } catch (err) {
      console.error('加载用户数据失败:', err);
      showError('加载本地数据失败');
    }
  }, [showError]);

  // 加载排序偏好
  const loadSortPreference = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT_PREFERENCE);
      if (saved && SORT_OPTIONS[saved.toUpperCase()]) {
        setSortBy(saved);
      }
    } catch (err) {
      console.error('加载排序偏好失败:', err);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    if (refreshingRef.current || funds.length === 0) {
      return;
    }

    refreshingRef.current = true;
    setLoading(true);

    try {
      const realtimeFfunds = await batchProcess(
        funds,
        async (fund) => {
          try {
            const realtimeData = await fetchFundRealtime(fund.code);
            return mergeRealtimeFund(fund, realtimeData);
          } catch (err) {
            console.error(`获取基金 ${fund.code} 数据失败:`, err);
            return recalculateProfit(fund);
          }
        },
        API_CONFIG.MAX_CONCURRENT
      );

      const expandedFfunds = realtimeFfunds.filter((fund) => fund.expanded);
      const holdingsByFund = {};
      const stockCodes = new Set();

      for (const fund of expandedFfunds) {
        let holdings = fund.holdings || [];
        if (!fund.holdingsLoaded) {
          holdings = await fetchFundHoldings(fund.code);
          holdingsByFund[fund.code] = holdings;
        }
        holdings.forEach((stock) => {
          if (stock?.code) {
            stockCodes.add(stock.code);
          }
        });
      }

      let enrichedFfunds = realtimeFfunds.map((fund) => {
        const nextHoldings = holdingsByFund[fund.code];
        if (!nextHoldings) return fund;
        return {
          ...fund,
          holdings: nextHoldings,
          holdingsLoaded: true
        };
      });

      if (stockCodes.size > 0) {
        const stockQuotes = await fetchBatchStockQuotes(Array.from(stockCodes));

        enrichedFfunds = enrichedFfunds.map((fund) => {
          if (!fund.expanded || !Array.isArray(fund.holdings)) return fund;
          return {
            ...fund,
            holdings: fund.holdings.map((stock) => {
              const quote = stockQuotes[stock.code];
              if (!quote) {
                return {
                  ...stock,
                  price: sanitizeStockPrice(stock.price, stock.code)
                };
              }
              return {
                ...stock,
                price: sanitizeStockPrice(quote.current, stock.code) ?? sanitizeStockPrice(stock.price, stock.code),
                change: quote.percent ?? stock.change ?? null
              };
            })
          };
        });
      }

      setFfunds(enrichedFfunds);
      saveUserData(enrichedFfunds);
      setCountdown(refreshInterval);
    } catch (err) {
      console.error('刷新数据失败:', err);
      showError('刷新数据失败，请检查网络连接');
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }, [funds, refreshInterval, saveUserData, showError]);

  useEffect(() => {
    let resolvedTheme = 'light';

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        resolvedTheme = savedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        resolvedTheme = 'dark';
      }
    } catch (err) {
      console.error('读取主题设置失败:', err);
    }

    applyTheme(resolvedTheme, false);
  }, [applyTheme]);

  useEffect(() => {
    loadUserData();
    loadSortPreference();
  }, [loadUserData, loadSortPreference]);

  useEffect(() => {
    if (funds.length === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshAllData();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [funds.length, refreshInterval, refreshAllData]);

  const handleSortChange = (value) => {
    setSortBy(value);
    try {
      localStorage.setItem(STORAGE_KEYS.SORT_PREFERENCE, value);
    } catch (err) {
      console.error('保存排序偏好失败:', err);
    }
  };

  const handleToggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  const handleAddFund = async (fundInput) => {
    const code = typeof fundInput === 'string' ? fundInput.trim() : String(fundInput?.CODE || '').trim();
    const name = typeof fundInput === 'string' ? null : fundInput?.NAME || fundInput?.SHORTNAME || null;
    const fundType = typeof fundInput === 'string' ? null : fundInput?.FundBaseInfo?.FTYPE || null;

    if (!/^\d{6}$/.test(code)) {
      showError('请输入有效的 6 位基金代码');
      return;
    }

    if (funds.some((fund) => fund.code === code)) {
      showError('该基金已在列表中');
      return;
    }

    setLoading(true);

    try {
      const realtimeData = await fetchFundRealtime(code);
      const newFund = recalculateProfit({
        code,
        name: realtimeData.name || name || `基金(${code})`,
        fundType,
        ...realtimeData
      });

      const nextFfunds = [...funds, newFund];
      setFfunds(nextFfunds);
      saveUserData(nextFfunds);
      setCountdown(refreshInterval);
      success(`已添加 ${newFund.name}`);

      // 自动滚动到新基金位置（页面底部）
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    } catch (err) {
      console.error('添加基金失败:', err);
      showError('添加基金失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFund = (code) => {
    const nextFfunds = funds.filter((fund) => fund.code !== code);
    setFfunds(nextFfunds);
    saveUserData(nextFfunds);
  };

  const openFavoriteSetup = (fund) => {
    const amountValue = Number.parseFloat(fund?.amount);
    const existingProfitValue = Number.parseFloat(fund?.existingProfit);
    setFavoriteSetup({
      code: fund.code,
      name: fund.name,
      amountInput: Number.isFinite(amountValue) && amountValue > 0 ? String(amountValue) : '',
      existingProfitInput: Number.isFinite(existingProfitValue) ? String(existingProfitValue) : '',
      error: ''
    });
  };

  const closeFavoriteSetup = () => {
    setFavoriteSetup(null);
  };

  const handleFavoriteSetupChange = (field, value) => {
    setFavoriteSetup((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
        error: ''
      };
    });
  };

  const handleConfirmFavoriteSetup = (event) => {
    event.preventDefault();
    if (!favoriteSetup) return;

    const amount = Number.parseFloat(favoriteSetup.amountInput);
    const existingProfit = Number.parseFloat(favoriteSetup.existingProfitInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFavoriteSetup((current) =>
        current
          ? {
              ...current,
              error: '持仓金额必须大于 0'
            }
          : current
      );
      return;
    }

    if (!Number.isFinite(existingProfit)) {
      setFavoriteSetup((current) =>
        current
          ? {
              ...current,
              error: '已有持有收益必须是有效数字'
            }
          : current
      );
      return;
    }

    const target = funds.find((fund) => fund.code === favoriteSetup.code);
    if (!target) {
      closeFavoriteSetup();
      return;
    }

    const nextCostPrice = deriveCostPriceFromProfit(amount, existingProfit, target.gsz);
    const nextFfunds = funds.map((fund) => {
      if (fund.code !== favoriteSetup.code) return fund;
      return recalculateProfit({
        ...fund,
        isFavorite: true,
        amount,
        existingProfit,
        costPrice: nextCostPrice,
        showAmountEdit: false,
        showExistingProfitEdit: false
      });
    });

    setFfunds(nextFfunds);
    saveUserData(nextFfunds);
    closeFavoriteSetup();
    success(`已加入自选：${target.name}`);
  };

  const handleToggleFavorite = (code) => {
    const target = funds.find((fund) => fund.code === code);
    if (!target) return;

    if (!target.isFavorite) {
      openFavoriteSetup(target);
      return;
    }

    const nextFfunds = funds.map((fund) => (fund.code === code ? { ...fund, isFavorite: !fund.isFavorite } : fund));
    setFfunds(nextFfunds);
    saveUserData(nextFfunds);
  };

  const handleToggleExpand = async (code) => {
    const toggledFfunds = funds.map((fund) => (fund.code === code ? { ...fund, expanded: !fund.expanded } : fund));
    setFfunds(toggledFfunds);
    saveUserData(toggledFfunds);

    const target = toggledFfunds.find((fund) => fund.code === code);
    if (!target || !target.expanded) return;

    // 7天过期常量
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const isExpired = !target.lastHoldingsUpdate || (Date.now() - target.lastHoldingsUpdate > ONE_WEEK);

    try {
      if (target.holdingsLoaded && !isExpired) {
        // 使用缓存的重仓股数据，只刷新股价
        const stockCodes = (target.holdings || []).map((stock) => stock.code).filter(Boolean);
        if (!stockCodes.length) return;

        const stockQuotes = await fetchBatchStockQuotes(stockCodes);
        const nextFfunds = toggledFfunds.map((fund) => {
          if (fund.code !== code) return fund;
          return {
            ...fund,
            holdings: (fund.holdings || []).map((stock) => ({
              ...stock,
              price:
                sanitizeStockPrice(stockQuotes[stock.code]?.current, stock.code) ??
                sanitizeStockPrice(stock.price, stock.code),
              change: stockQuotes[stock.code]?.percent ?? stock.change ?? null
            }))
          };
        });

        setFfunds(nextFfunds);
        saveUserData(nextFfunds);
        return;
      }

      // 强制重新获取重仓股数据
      const holdings = await fetchFundHoldings(code, true);
      const stockCodes = holdings.map((stock) => stock.code).filter(Boolean);
      const stockQuotes = stockCodes.length ? await fetchBatchStockQuotes(stockCodes) : {};

      const nextFfunds = toggledFfunds.map((fund) => {
        if (fund.code !== code) return fund;
        return {
          ...fund,
          holdingsLoaded: true,
          lastHoldingsUpdate: Date.now(), // 更新重仓股最后更新时间
          holdings: holdings.map((stock) => ({
            ...stock,
            price: sanitizeStockPrice(stockQuotes[stock.code]?.current, stock.code) ?? sanitizeStockPrice(stock.price, stock.code),
            change: stockQuotes[stock.code]?.percent ?? stock.change ?? null
          }))
        };
      });

      setFfunds(nextFfunds);
      saveUserData(nextFfunds);
    } catch (err) {
      console.error('加载重仓股失败:', err);
      showError('加载重仓股数据失败');
    }
  };

  const handleSetAmountEdit = (code, editing) => {
    setFfunds((current) =>
      current.map((fund) => (fund.code === code ? { ...fund, showAmountEdit: Boolean(editing) } : fund))
    );
  };

  const handleSetExistingProfitEdit = (code, editing) => {
    setFfunds((current) =>
      current.map((fund) => (fund.code === code ? { ...fund, showExistingProfitEdit: Boolean(editing) } : fund))
    );
  };

  const handleAmountChange = useCallback(
    (code, value) => {
      const amount = value === '' ? null : Number.parseFloat(value);

      const nextFfunds = funds.map((fund) => {
        if (fund.code !== code) return fund;
        const currentPrice = Number.parseFloat(fund.gsz);
        const existingProfit = Number.parseFloat(fund.existingProfit);
        const nextCostPrice = Number.isFinite(existingProfit)
          ? deriveCostPriceFromProfit(amount, existingProfit, currentPrice)
          : fund.costPrice;

        return recalculateProfit({
          ...fund,
          amount,
          costPrice: nextCostPrice
        });
      });

      setFfunds(nextFfunds);
      saveUserData(nextFfunds);
    },
    [funds, saveUserData]
  );

  const handleExistingProfitChange = useCallback(
    (code, value) => {
      const existingProfit = value === '' ? null : Number.parseFloat(value);

      const nextFfunds = funds.map((fund) => {
        if (fund.code !== code) return fund;
        const currentPrice = Number.parseFloat(fund.gsz);
        const nextCostPrice = deriveCostPriceFromProfit(fund.amount, existingProfit, currentPrice);

        return recalculateProfit({
          ...fund,
          existingProfit,
          costPrice: nextCostPrice
        });
      });

      setFfunds(nextFfunds);
      saveUserData(nextFfunds);
    },
    [funds, saveUserData]
  );

  const handleToggleChart = (code) => {
    setFfunds((current) =>
      current.map((fund) => (fund.code === code ? { ...fund, chartExpanded: !fund.chartExpanded } : fund))
    );
  };

  const handleUpdateInterval = (value) => {
    const nextInterval = Math.max(
      UI_CONFIG.MIN_REFRESH_INTERVAL,
      Math.min(UI_CONFIG.MAX_REFRESH_INTERVAL, Number.parseInt(value, 10) || UI_CONFIG.DEFAULT_REFRESH_INTERVAL)
    );

    setRefreshInterval(nextInterval);
    setCountdown(nextInterval);
    saveUserData(funds, nextInterval);
    success(`刷新间隔已更新为 ${nextInterval} 秒`, UI_CONFIG.TOAST_DURATION);
  };

  const displayFfunds = useMemo(() => {
    const source = activeTab === 'all' ? funds : funds.filter((fund) => fund.isFavorite);
    const sorted = [...source];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.CHANGE_DESC:
          return (Number.parseFloat(b.gszzl) || 0) - (Number.parseFloat(a.gszzl) || 0);
        case SORT_OPTIONS.CHANGE_ASC:
          return (Number.parseFloat(a.gszzl) || 0) - (Number.parseFloat(b.gszzl) || 0);
        case SORT_OPTIONS.CODE_ASC:
          return a.code.localeCompare(b.code);
        case SORT_OPTIONS.CODE_DESC:
          return b.code.localeCompare(a.code);
        case SORT_OPTIONS.NAME_ASC:
          return a.name.localeCompare(b.name);
        case SORT_OPTIONS.NAME_DESC:
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [activeTab, funds, sortBy]);

  const summary = useMemo(() => {
    const favorites = funds.filter((fund) => fund.isFavorite);
    const tracked = favorites.filter((fund) => Number.parseFloat(fund.amount) > 0);
    const totalAssets = safeSum(tracked.map((fund) => Number.parseFloat(fund.amount) || 0));
    const dailyProfit = safeSum(tracked.map((fund) => Number.parseFloat(fund.dailyProfit) || 0));
    const totalProfit = safeSum(tracked.map((fund) => Number.parseFloat(fund.totalProfit) || 0));

    return {
      totalFfunds: funds.length,
      favoriteFfunds: favorites.length,
      totalAssets,
      dailyProfit,
      totalProfit
    };
  }, [funds]);

  return (
    <>
      <Head>
        <title>基金实时估值工作台</title>
        <meta name="description" content="轻量级基金估值、持仓与收益追踪工具" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <main className="page-shell">
        <section className="hero-panel">
          {/* 新增：绝对定位的主题切换按钮 */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
            aria-label="切换主题"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          
          <div className="hero-layout">
            <div className="hero-main">
              <div>
                <p className="hero-kicker">Real-time Fund Desk</p>
                <h1 className="page-title">基金实时估值工作台</h1>
                <p className="hero-subtitle">集中查看估值波动、重仓股走势和持仓收益，单页完成筛选、排序与追踪。</p>
              </div>
              <div className="hero-metrics">
                <div className="metric-chip">
                  <span className="metric-label">基金总数</span>
                  <span className="metric-value">{summary.totalFfunds}</span>
                </div>
                <div className="metric-chip">
                  <span className="metric-label">自选数量</span>
                  <span className="metric-value">{summary.favoriteFfunds}</span>
                </div>
              </div>
              <FundSearch onSelect={handleAddFund} />
            </div>
            <SectorDistributionChart funds={funds} />
          </div>
          <PerformanceComparisonChart funds={funds} />
        </section>

        <ControlBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          funds={funds}
          countdown={countdown}
          onRefresh={refreshAllData}
          loading={loading}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings((value) => !value)}
          refreshInterval={refreshInterval}
          onIntervalChange={handleUpdateInterval}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />

        {displayFfunds.length === 0 ? (
          <section className="empty-state">
            <h2>列表为空</h2>
            <p>在顶部搜索基金代码或名称，点击结果即可加入追踪。</p>
          </section>
        ) : funds.length === 0 && loading ? (
          <section className="fund-grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </section>
        ) : (
          <section className="fund-grid">
            {displayFfunds.map((fund) => (
              <FundCard
                key={fund.code}
                fund={fund}
                onRemove={() => handleRemoveFund(fund.code)}
                onToggleFavorite={() => handleToggleFavorite(fund.code)}
                onToggleExpand={() => handleToggleExpand(fund.code)}
                onToggleChart={handleToggleChart}
                onAmountChange={handleAmountChange}
                onExistingProfitChange={handleExistingProfitChange}
                onSetAmountEdit={handleSetAmountEdit}
                onSetExistingProfitEdit={handleSetExistingProfitEdit}
              />
            ))}
          </section>
        )}

        {favoriteSetup && (
          <div
            className="favorite-setup-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="加入自选设置"
            onClick={closeFavoriteSetup}
          >
            <section className="favorite-setup-card" onClick={(event) => event.stopPropagation()}>
              <h2 className="favorite-setup-title">加入自选</h2>
              <p className="favorite-setup-subtitle">
                {favoriteSetup.name} ({favoriteSetup.code})
              </p>

              <form className="favorite-setup-form" onSubmit={handleConfirmFavoriteSetup}>
                <label className="favorite-setup-field">
                  <span>持仓金额</span>
                  <input
                    type="number"
                    className="input favorite-setup-input"
                    value={favoriteSetup.amountInput}
                    onChange={(event) => handleFavoriteSetupChange('amountInput', event.target.value)}
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </label>

                <label className="favorite-setup-field">
                  <span>已有持有收益</span>
                  <input
                    type="number"
                    className="input favorite-setup-input"
                    value={favoriteSetup.existingProfitInput}
                    onChange={(event) => handleFavoriteSetupChange('existingProfitInput', event.target.value)}
                    step="0.01"
                  />
                </label>

                {favoriteSetup.error ? <p className="favorite-setup-error">{favoriteSetup.error}</p> : null}

                <div className="favorite-setup-actions">
                  <button type="button" className="button button-secondary" onClick={closeFavoriteSetup}>
                    取消
                  </button>
                  <button type="submit" className="button">
                    确认加入
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </>
  );
}