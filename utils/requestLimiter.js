/**
 * 请求限流器
 * @param {number} concurrency - 并发数
 */
export class RequestLimiter {
  constructor(concurrency = 10) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  /**
   * 添加任务到队列
   * @param {Function} task - 异步任务
   * @returns {Promise<any>}
   */
  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  /**
   * 处理队列
   */
  async process() {
    while (this.queue.length > 0 && this.running < this.concurrency) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;

      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        this.process(); // 处理下一个
      }
    }
  }
}

/**
 * 批量执行（限流版）
 * @param {Array} items - 项目数组
 * @param {Function} handler - 处理函数
 * @param {number} limit - 并发限制
 * @returns {Promise<Array>}
 */
export async function batchProcess(items, handler, limit = 10) {
  const limiter = new RequestLimiter(limit);

  const promises = items.map(item =>
    limiter.add(() => handler(item))
  );

  return Promise.all(promises);
}
