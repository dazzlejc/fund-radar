/**
 * Fund Data Service
 * Pure front-end JSONP implementation with guarded concurrency.
 */

import { UI_CONFIG, STORAGE_KEYS } from '../constants/config.js';

const SCRIPT_TIMEOUT_MS = 7000;
const MIN_REQUEST_INTERVAL = 200; // 最小请求间隔：200ms

// 请求时间戳记录
const requestTimestamps = new Map();

// 缓存相关函数
const getHoldingsCache = () => {
  if (!inBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOLDINGS_CACHE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('读取重仓股缓存失败:', error);
    return null;
  }
};

const setHoldingsCache = (fundCode, holdings) => {
  if (!inBrowser()) return;
  try {
    const cache = getHoldingsCache() || {};
    cache[fundCode] = {
      data: holdings,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.HOLDINGS_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('保存重仓股缓存失败:', error);
  }
};

const getCachedHoldings = (fundCode) => {
  const cache = getHoldingsCache();
  if (!cache || !cache[fundCode]) return null;

  const { data, timestamp } = cache[fundCode];
  const age = Date.now() - timestamp;

  if (age > UI_CONFIG.HOLDINGS_CACHE_DURATION) {
    // 缓存过期，删除
    delete cache[fundCode];
    try {
      localStorage.setItem(STORAGE_KEYS.HOLDINGS_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
    return null;
  }

  return data;
};

const HISTORY_PER_MAP = {
  '1d': 20,
  '5d': 20,
  '1m': 40,
  '3m': 120,
  '1y': 260,
  '3y': 780
};

const BENCHMARK_SECID_MAP = {
  '000016': '1.000016', // 上证50
  '000300': '1.000300', // 沪深300
  '000905': '1.000905', // 中证500
  '000852': '1.000852', // 中证1000
  '399006': '0.399006' // 创业板指
};

const inBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const removeScript = (script) => {
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
};

const toNumberOrNull = (value) => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const formatDateFromTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resetFundHistoryGlobals = () => {
  if (!inBrowser()) return;
  window.Data_netWorthTrend = undefined;
  window.Data_ACWorthTrend = undefined;
  window.fS_code = undefined;
};

const parseFundHistoryFromPingzhong = (fundCode, per) => {
  const resolvedCode = String(window.fS_code || '').trim();
  if (resolvedCode && resolvedCode !== String(fundCode)) {
    return [];
  }

  const netWorthTrend = Array.isArray(window.Data_netWorthTrend) ? window.Data_netWorthTrend : [];
  const acWorthTrend = Array.isArray(window.Data_ACWorthTrend) ? window.Data_ACWorthTrend : [];

  const accumulatedMap = new Map();
  acWorthTrend.forEach((item) => {
    if (!Array.isArray(item) || item.length < 2) return;
    const timestamp = Number.parseInt(item[0], 10);
    const value = toNumberOrNull(item[1]);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return;
    accumulatedMap.set(timestamp, value);
  });

  const historyData = netWorthTrend
    .map((item) => {
      const timestamp = Number.parseInt(item?.x, 10);
      const netValue = toNumberOrNull(item?.y);
      if (!Number.isFinite(timestamp) || !Number.isFinite(netValue)) return null;

      const accumulatedValue = accumulatedMap.get(timestamp);
      const growth = toNumberOrNull(item?.equityReturn);
      return {
        date: formatDateFromTimestamp(timestamp),
        netValue,
        accumulatedValue: Number.isFinite(accumulatedValue) ? accumulatedValue : null,
        dailyGrowth: Number.isFinite(growth) ? `${growth}%` : null
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return historyData.slice(-per);
};

let realtimeQueue = Promise.resolve();
const queueRealtimeTask = (task) => {
  const run = realtimeQueue.then(task, task);
  realtimeQueue = run.catch(() => {});
  return run;
};

let apidataQueue = Promise.resolve();
const withApidataLock = (task) => {
  const run = apidataQueue.then(task, task);
  apidataQueue = run.catch(() => {});
  return run;
};

const loadScript = (url, timeout = SCRIPT_TIMEOUT_MS) => {
  if (!inBrowser()) {
    return Promise.reject(new Error('No browser environment'));
  }

  // 检查最小请求间隔
  const now = Date.now();
  const lastRequestTime = requestTimestamps.get(url) || 0;
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    return new Promise((resolve) => {
      setTimeout(() => {
        requestTimestamps.set(url, Date.now());
        return loadScript(url, timeout).then(resolve);
      }, delay);
    });
  }

  requestTimestamps.set(url, now);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      removeScript(script);
    };

    const finish = (handler, payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(payload);
    };

    script.onload = () => finish(resolve);
    script.onerror = () => finish(reject, new Error(`Load failed: ${url}`));

    const timer = setTimeout(() => {
      finish(reject, new Error(`Load timeout: ${url}`));
    }, timeout);

    document.body.appendChild(script);
  });
};

const loadJsonp = (url, callbackName, timeout = SCRIPT_TIMEOUT_MS) => {
  if (!inBrowser()) {
    return Promise.reject(new Error('No browser environment'));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      delete window[callbackName];
      removeScript(script);
    };

    const finish = (handler, payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(payload);
    };

    window[callbackName] = (payload) => {
      finish(resolve, payload);
    };

    script.onerror = () => {
      finish(reject, new Error(`JSONP load failed: ${url}`));
    };

    script.onload = () => {
      // no-op: JSONP payload is resolved by callback
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`JSONP timeout: ${url}`));
    }, timeout);

    document.body.appendChild(script);
  });
};

const toTencentMarketPrefix = (stockCode) => {
  const code = String(stockCode || '');
  if (!/^\d{6}$/.test(code)) return null;
  if (code.startsWith('6') || code.startsWith('9')) return 'sh';
  if (code.startsWith('4') || code.startsWith('8')) return 'bj';
  return 'sz';
};

/**
 * 更稳健的HTML解析 - 使用DOMParser
 * @param {string} html - HTML字符串
 * @returns {Document}
 */
const parseHTML = (html) => {
  if (!inBrowser()) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc;
  } catch (error) {
    console.error('HTML解析失败:', error);
    return null;
  }
};

/**
 * 从HTML表格中提取重仓股数据（增强版，带监控日志）
 * @param {string} html - HTML字符串
 * @returns {Array}
 */
const extractHoldingsFromHTML = (html) => {
  if (!html || typeof html !== 'string') {
    console.warn('[重仓股解析] HTML内容为空或格式错误');
    return [];
  }

  const doc = parseHTML(html);
  if (!doc) {
    // 降级到正则表达式解析
    console.warn('[重仓股解析] DOMParser失败，降级到正则表达式解析');
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const holdings = [];

    rows.forEach((row, index) => {
      const cells =
        (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [])
          .map((td) => td.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim())
          .filter(Boolean) || [];

      if (!cells.length) return;

      const code = cells.find((txt) => /^\d{6}$/.test(txt)) || '';
      const weightCell = cells.find((txt) => /\d+(?:\.\d+)?\s*%/.test(txt)) || '';
      const weightMatch = weightCell.match(/([\d.]+)\s*%/);
      const weight = weightMatch ? `${weightMatch[1]}%` : weightCell;
      const name = cells.find((txt) => txt !== code && txt !== weightCell && !/^\d+(?:\.\d+)?$/.test(txt)) || '';

      if (!code && !name && !weight) return;

      holdings.push({
        index: index + 1,
        code,
        name,
        weight,
        price: null,
        change: null
      });
    });

    // 监控日志：正则解析结果
    if (holdings.length === 0) {
      console.error('[重仓股解析] 正则表达式解析失败，可能数据源格式已变更');
    } else {
      console.log(`[重仓股解析] 正则解析成功，提取到 ${holdings.length} 条数据`);
    }

    return holdings;
  }

  try {
    const rows = doc.querySelectorAll('tr');
    const holdings = [];

    rows.forEach((row, index) => {
      const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent.trim());
      if (!cells.length || cells.every((cell) => !cell)) return;

      const code = cells.find((cell) => /^\d{6}$/.test(cell)) || '';
      const weightCell = cells.find((cell) => /^\d+(?:\.\d+)?\s*%/.test(cell)) || '';
      const weightMatch = weightCell.match(/([\d.]+)\s*%/);
      const weight = weightMatch ? `${weightMatch[1]}%` : weightCell;
      const name = cells.find((cell) => cell !== code && cell !== weightCell && !/^\d+(?:\.\d+)?$/.test(cell)) || '';

      if (!code && !name && !weight) return;

      holdings.push({
        index: index + 1,
        code,
        name,
        weight,
        price: null,
        change: null
      });
    });

    // 监控日志：DOM解析结果
    if (holdings.length === 0) {
      console.error('[重仓股解析] DOM解析结果为空，可能数据源格式已变更，请检查东方财富HTML结构');
      // 尝试降级到正则表达式
      console.warn('[重仓股解析] 尝试降级到正则表达式解析');
      return extractHoldingsFromHTML(html);
    } else {
      console.log(`[重仓股解析] DOM解析成功，提取到 ${holdings.length} 条数据`);
    }

    return holdings;
  } catch (error) {
    console.error('[重仓股解析] DOM解析失败，降级到正则表达式:', error);
    // 如果DOMParser也失败，使用正则表达式
    return extractHoldingsFromHTML(html);
  }
};

const parseTencentSimpleQuote = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split('~');
  if (parts.length < 5) return null;

  // Tencent simple quote payload sometimes includes stock code at parts[2].
  // Detect both old/new payloads and avoid treating code as price.
  const slot2 = toNumberOrNull(parts[2]);
  const slot3 = toNumberOrNull(parts[3]);
  const hasEmbeddedCode = /^\d{6}$/.test(String(parts[2] || ''));
  const looksLikeCodeInPriceSlot =
    Number.isFinite(slot2) &&
    slot2 >= 100000 &&
    slot2 <= 999999 &&
    Number.isFinite(slot3) &&
    slot3 > 0 &&
    slot3 < 100000;
  const priceIndex = hasEmbeddedCode || looksLikeCodeInPriceSlot ? 3 : 2;
  const changeIndex = priceIndex + 1;
  const percentIndex = priceIndex + 2;

  return {
    name: parts[1] || '',
    current: toNumberOrNull(parts[priceIndex]),
    change: toNumberOrNull(parts[changeIndex]),
    percent: toNumberOrNull(parts[percentIndex])
  };
};

const fetchTencentSimpleQuotes = async (stockCodes) => {
  if (!inBrowser()) return {};

  const pairs = stockCodes
    .map((code) => {
      const normalized = String(code || '').trim();
      const prefix = toTencentMarketPrefix(normalized);
      if (!prefix) return null;
      return {
        code: normalized,
        queryCode: `s_${prefix}${normalized}`,
        varName: `v_s_${prefix}${normalized}`
      };
    })
    .filter(Boolean);

  if (!pairs.length) return {};

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://qt.gtimg.cn/q=${pairs.map((p) => p.queryCode).join(',')}&t=${Date.now()}`;
    script.async = true;

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;

      // 清理全局变量
      pairs.forEach((pair) => {
        try {
          delete window[pair.varName];
        } catch (e) {
          // 忽略删除失败
        }
      });

      removeScript(script);
    };

    const parseResult = () => {
      const result = {};
      pairs.forEach((pair) => {
        const parsed = parseTencentSimpleQuote(window[pair.varName]);
        if (parsed) {
          result[pair.code] = parsed;
        }
      });
      return result;
    };

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onload = () => finish(parseResult());
    script.onerror = () => finish({});

    const timer = setTimeout(() => {
      finish(parseResult());
    }, SCRIPT_TIMEOUT_MS);

    document.body.appendChild(script);
  });
};

/**
 * Fetch fund realtime data.
 * Eastmoney fundgz JSONP uses a fixed global callback name (jsonpgz),
 * so this method is serialized to avoid callback collisions.
 * @param {string} fundCode
 * @returns {Promise<Object>}
 */
export const fetchFundRealtime = (fundCode) => {
  if (!inBrowser()) {
    return Promise.reject(new Error('No browser environment'));
  }

  return queueRealtimeTask(
    () =>
      new Promise((resolve, reject) => {
        const gzUrl = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`;
        const script = document.createElement('script');
        script.src = gzUrl;
        script.async = true;

        const previousHandler = window.jsonpgz;
        let settled = false;

        const cleanup = () => {
          clearTimeout(timer);
          script.onload = null;
          script.onerror = null;
          if (window.jsonpgz === onJsonp) {
            window.jsonpgz = typeof previousHandler === 'function' ? previousHandler : () => {};
          }
          removeScript(script);
        };

        const finish = (handler, payload) => {
          if (settled) return;
          settled = true;
          cleanup();
          handler(payload);
        };

        const fallback = () => {
          fetchFundRealtimeFallback(fundCode)
            .then((data) => finish(resolve, data))
            .catch((error) => finish(reject, error));
        };

        const onJsonp = (json) => {
          if (!json || typeof json !== 'object') {
            fallback();
            return;
          }

          finish(resolve, {
            code: json.fundcode || fundCode,
            name: json.name || `基金(${fundCode})`,
            dwjz: json.dwjz || null,
            gsz: json.gsz || null,
            gztime: json.gztime || null,
            jzrq: json.jzrq || null,
            gszzl: toNumberOrNull(json.gszzl),
            noValuation: false,
            holdings: []
          });
        };

        window.jsonpgz = onJsonp;

        script.onerror = fallback;
        script.onload = () => {
          // noop: data is returned by window.jsonpgz
        };

        const timer = setTimeout(() => {
          fallback();
        }, SCRIPT_TIMEOUT_MS);

        document.body.appendChild(script);
      })
  );
};

/**
 * Fallback realtime data from Tencent.
 * @param {string} fundCode
 * @returns {Promise<Object>}
 */
const fetchFundRealtimeFallback = async (fundCode) => {
  if (!inBrowser()) {
    throw new Error('No browser environment');
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://qt.gtimg.cn/q=jj${fundCode}&t=${Date.now()}`;
    script.async = true;

    const varName = `v_jj${fundCode}`;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;

      // 清理全局变量
      try {
        delete window[varName];
      } catch (e) {
        // 忽略删除失败
      }

      removeScript(script);
    };

    const buildFallback = () => ({
      code: fundCode,
      name: `基金(${fundCode})`,
      dwjz: null,
      gsz: null,
      gztime: null,
      jzrq: null,
      gszzl: null,
      noValuation: true,
      holdings: []
    });

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onload = () => {
      const raw = window[varName];
      if (!raw || typeof raw !== 'string') {
        finish(buildFallback());
        return;
      }

      const parts = raw.split('~');
      finish({
        code: fundCode,
        name: parts[1] || `基金(${fundCode})`,
        dwjz: parts[5] || null,
        gsz: parts[5] || null,
        gztime: null,
        jzrq: parts[8] ? parts[8].slice(0, 10) : null,
        gszzl: toNumberOrNull(parts[7]),
        noValuation: true,
        holdings: []
      });
    };

    script.onerror = () => {
      finish(buildFallback());
    };

    const timer = setTimeout(() => {
      finish(buildFallback());
    }, SCRIPT_TIMEOUT_MS);

    document.body.appendChild(script);
  });
};

/**
 * Fetch fund holdings and attach stock quotes.
 * @param {string} fundCode
 * @param {boolean} forceRefresh - 强制刷新，忽略缓存
 * @returns {Promise<Array>}
 */
export const fetchFundHoldings = async (fundCode, forceRefresh = false) => {
  if (!inBrowser()) return [];

  // 检查缓存
  if (!forceRefresh) {
    const cached = getCachedHoldings(fundCode);
    if (cached) {
      console.log(`使用缓存的重仓股数据: ${fundCode}`);
      return cached;
    }
  }

  return withApidataLock(async () => {
    try {
      const holdingsUrl = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=&month=&_=${Date.now()}`;
      await loadScript(holdingsUrl);

      const html = window.apidata?.content || '';
      window.apidata = undefined;

      // 使用更稳健的DOM解析
      const holdings = extractHoldingsFromHTML(html);

      const topHoldings = holdings.slice(0, 10);
      const quoteMap = await fetchTencentSimpleQuotes(topHoldings.map((h) => h.code));

      const result = topHoldings.map((item) => {
        const quote = quoteMap[item.code];
        return {
          ...item,
          price: quote?.current ?? null,
          change: quote?.percent ?? null
        };
      });

      // 保存到缓存
      setHoldingsCache(fundCode, result);

      return result;
    } catch (error) {
      console.error('Failed to fetch holdings:', error);
      return [];
    }
  });
};

/**
 * Fetch single stock quote.
 * @param {string} stockCode
 * @returns {Promise<Object|null>}
 */
export const fetchStockQuote = async (stockCode) => {
  const quotes = await fetchBatchStockQuotes([stockCode]);
  return quotes[stockCode] || null;
};

/**
 * Batch fetch stock quotes.
 * @param {Array<string>} stockCodes
 * @returns {Promise<Object<string, Object>>}
 */
export const fetchBatchStockQuotes = async (stockCodes) => {
  const uniqueCodes = Array.from(
    new Set(
      (stockCodes || [])
        .map((code) => String(code || '').trim())
        .filter((code) => /^\d{6}$/.test(code))
    )
  );

  if (!uniqueCodes.length) return {};

  const quoteMap = await fetchTencentSimpleQuotes(uniqueCodes);
  const result = {};

  uniqueCodes.forEach((code) => {
    const quote = quoteMap[code];
    if (!quote) return;
    result[code] = {
      code,
      name: quote.name,
      current: quote.current,
      change: quote.change,
      percent: quote.percent
    };
  });

  return result;
};

/**
 * Search funds.
 * @param {string} keyword
 * @returns {Promise<Array>}
 */
export const searchFunds = async (keyword) => {
  if (!keyword?.trim() || !inBrowser()) return [];

  const callbackName = `FundSuggest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(
    keyword
  )}&callback=${callbackName}&_=${Date.now()}`;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      delete window[callbackName];
      removeScript(script);
    };

    const finish = (handler, payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(payload);
    };

    window[callbackName] = (data) => {
      const rows = Array.isArray(data?.Datas) ? data.Datas : [];
      const funds = rows.filter(
        (item) => item.CATEGORY === 700 || item.CATEGORY === '700' || item.CATEGORYDESC === '基金'
      );
      finish(resolve, funds);
    };

    script.onerror = () => {
      finish(reject, new Error('Search request failed'));
    };

    script.onload = () => {
      // noop: payload is handled by callback
    };

    const timer = setTimeout(() => {
      finish(resolve, []);
    }, SCRIPT_TIMEOUT_MS);

    document.body.appendChild(script);
  });
};

/**
 * Fetch fund history net value data.
 * @param {string} fundCode
 * @param {string} period
 * @returns {Promise<Array>}
 */
export const fetchFundHistory = async (fundCode, period = '1m') => {
  if (!inBrowser()) {
    return Promise.reject(new Error('No browser environment'));
  }

  const per = HISTORY_PER_MAP[period] || HISTORY_PER_MAP['1m'];

  return withApidataLock(async () => {
    try {
      const normalizedCode = String(fundCode || '').trim();
      if (!/^\d{6}$/.test(normalizedCode)) {
        return [];
      }

      resetFundHistoryGlobals();
      const url = `https://fund.eastmoney.com/pingzhongdata/${normalizedCode}.js?v=${Date.now()}`;
      await loadScript(url);

      const historyData = parseFundHistoryFromPingzhong(normalizedCode, per);
      if (!historyData.length) {
        throw new Error(`No history data resolved for fund ${normalizedCode}`);
      }

      return historyData;
    } catch (error) {
      console.error('Failed to fetch fund history:', error);
      throw error;
    } finally {
      resetFundHistoryGlobals();
    }
  });
};

/**
 * Fetch benchmark index history data.
 * @param {string} indexCode
 * @param {string} period
 * @returns {Promise<Array>}
 */
export const fetchBenchmarkHistory = async (indexCode = '000300', period = '1m') => {
  if (!inBrowser()) {
    return Promise.reject(new Error('No browser environment'));
  }

  const per = HISTORY_PER_MAP[period] || HISTORY_PER_MAP['1m'];
  const secid = BENCHMARK_SECID_MAP[indexCode] || indexCode;
  if (!/^[01]\.\d{6}$/.test(secid)) {
    throw new Error(`Unsupported benchmark code: ${indexCode}`);
  }

  try {
    const callbackName = `BenchmarkHistory_${String(indexCode).replace(/[^\w]/g, '')}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const url =
      `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
      `?secid=${secid}` +
      `&klt=101&fqt=1&lmt=${per}&end=20500000&iscca=1` +
      `&fields1=f1,f2,f3,f4,f5,f6` +
      `&fields2=f51,f52,f53,f54,f55,f56,f57,f58` +
      `&cb=${callbackName}&_=${Date.now()}`;
    const data = await loadJsonp(url, callbackName);

    const klines = Array.isArray(data?.data?.klines) ? data.data.klines : [];
    const historyData = klines
      .map((line) => {
        const parts = String(line || '').split(',');
        const date = parts[0] || null;
        const open = toNumberOrNull(parts[1]);
        const close = toNumberOrNull(parts[2]);
        const high = toNumberOrNull(parts[3]);
        const low = toNumberOrNull(parts[4]);
        const volume = toNumberOrNull(parts[5]);

        return {
          date,
          open,
          close,
          high,
          low,
          volume
        };
      })
      .filter((item) => item.date && Number.isFinite(item.close));

    historyData.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return historyData;
  } catch (error) {
    console.error('Failed to fetch benchmark history:', error);
    throw error;
  }
};

/**
 * Clear holdings cache
 * @param {string} fundCode - Optional. If not provided, clears all cache.
 */
export const clearHoldingsCache = (fundCode = null) => {
  if (!inBrowser()) return;
  try {
    if (fundCode) {
      const cache = getHoldingsCache();
      if (cache && cache[fundCode]) {
        delete cache[fundCode];
        localStorage.setItem(STORAGE_KEYS.HOLDINGS_CACHE, JSON.stringify(cache));
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.HOLDINGS_CACHE);
    }
  } catch (error) {
    console.error('清理缓存失败:', error);
  }
};
