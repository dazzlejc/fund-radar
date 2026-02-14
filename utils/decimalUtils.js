/**
 * 浮点数精度处理工具
 * 使用 decimal.js-light 处理精度问题
 */

import Decimal from 'decimal.js-light';

/**
 * 安全的加法运算
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export const safeAdd = (a, b) => {
  try {
    const da = new Decimal(a || 0);
    const db = new Decimal(b || 0);
    return da.plus(db).toNumber();
  } catch (error) {
    console.error('加法运算失败:', error);
    return (Number(a) || 0) + (Number(b) || 0);
  }
};

/**
 * 安全的减法运算
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export const safeSubtract = (a, b) => {
  try {
    const da = new Decimal(a || 0);
    const db = new Decimal(b || 0);
    return da.minus(db).toNumber();
  } catch (error) {
    console.error('减法运算失败:', error);
    return (Number(a) || 0) - (Number(b) || 0);
  }
};

/**
 * 安全的乘法运算
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export const safeMultiply = (a, b) => {
  try {
    const da = new Decimal(a || 0);
    const db = new Decimal(b || 0);
    return da.times(db).toNumber();
  } catch (error) {
    console.error('乘法运算失败:', error);
    return (Number(a) || 0) * (Number(b) || 0);
  }
};

/**
 * 安全的除法运算
 * @param {number|string} a
 * @param {number|string} b
 * @returns {number}
 */
export const safeDivide = (a, b) => {
  try {
    const da = new Decimal(a || 0);
    const db = new Decimal(b || 1);
    return da.dividedBy(db).toNumber();
  } catch (error) {
    console.error('除法运算失败:', error);
    return (Number(a) || 0) / (Number(b) || 1);
  }
};

/**
 * 安全的求和
 * @param {Array<number|string>} numbers
 * @returns {number}
 */
export const safeSum = (numbers) => {
  if (!Array.isArray(numbers)) return 0;
  return numbers.reduce((sum, num) => safeAdd(sum, num), 0);
};

/**
 * 格式化金额，保留2位小数
 * @param {number|string} value
 * @returns {string}
 */
export const formatMoney = (value) => {
  try {
    const d = new Decimal(value || 0);
    return d.toFixed(2);
  } catch (error) {
    console.error('格式化金额失败:', error);
    return Number(value || 0).toFixed(2);
  }
};

/**
 * 格式化百分比，保留2位小数
 * @param {number|string} value
 * @returns {string}
 */
export const formatPercent = (value) => {
  try {
    const d = new Decimal(value || 0);
    return d.toFixed(2);
  } catch (error) {
    console.error('格式化百分比失败:', error);
    return Number(value || 0).toFixed(2);
  }
};
