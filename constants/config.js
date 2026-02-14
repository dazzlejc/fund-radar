/**
 * 应用配置常量
 */

// API 配置
export const API_CONFIG = {
  TIMEOUT: 10000,
  MAX_CONCURRENT: 10,
  BATCH_SIZE: 10,
  SEARCH_DEBOUNCE: 300,
  MAX_SEARCH_RESULTS: 10
};

// 刷新间隔配置（秒）
export const REFRESH_INTERVALS = [5, 10, 30, 60, 120, 300];

// 本地存储配置
export const STORAGE_KEYS = {
  USER_DATA: 'fund_user_data',
  DATA_VERSION: 'data_version',
  THEME: 'theme_mode',
  HOLDINGS_CACHE: 'fund_holdings_cache',
  SORT_PREFERENCE: 'fund_sort_preference',
  EXPORT_DATA: 'fund_export_data'
};

// 数据版本（用于处理本地存储格式变更）
export const DATA_VERSION = '2.0.0';

// UI 配置
export const UI_CONFIG = {
  MIN_REFRESH_INTERVAL: 5,
  MAX_REFRESH_INTERVAL: 300,
  DEFAULT_REFRESH_INTERVAL: 5,
  TOAST_DURATION: 3000,
  HOLDINGS_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000 // 7天缓存
};

// 排序选项
export const SORT_OPTIONS = {
  CODE_ASC: 'code_asc',
  CODE_DESC: 'code_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  CHANGE_DESC: 'change_desc',
  CHANGE_ASC: 'change_asc'
};

// 排序标签
export const SORT_LABELS = {
  [SORT_OPTIONS.CODE_ASC]: '代码 A-Z',
  [SORT_OPTIONS.CODE_DESC]: '代码 Z-A',
  [SORT_OPTIONS.NAME_ASC]: '名称 A-Z',
  [SORT_OPTIONS.NAME_DESC]: '名称 Z-A',
  [SORT_OPTIONS.CHANGE_DESC]: '涨跌幅 高->低',
  [SORT_OPTIONS.CHANGE_ASC]: '涨跌幅 低->高'
};

export default {
  API_CONFIG,
  REFRESH_INTERVALS,
  STORAGE_KEYS,
  DATA_VERSION,
  UI_CONFIG,
  SORT_OPTIONS,
  SORT_LABELS,
};
