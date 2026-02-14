import { useEffect, useRef } from 'react';

/**
 * 数值更新闪烁动画
 * 当value变化时，添加短暂的闪烁效果
 */
export function useValueFlash(value, duration = 600) {
  const ref = useRef(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value && ref.current) {
      const element = ref.current;

      // 添加闪烁动画
      element.classList.add('value-flash');

      // 动画结束后移除class
      const timeout = setTimeout(() => {
        element.classList.remove('value-flash');
      }, duration);

      return () => clearTimeout(timeout);
    }

    prevValueRef.current = value;
  }, [value, duration]);

  return ref;
}

/**
 * 带有闪烁效果的数值显示组件
 */
export function ValueFlash({ value, className = '', tag: Tag = 'span', children, ...props }) {
  const ref = useValueFlash(value);

  if (children) {
    return (
      <Tag ref={ref} className={`value-flash-wrapper ${className}`} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={`value-flash-wrapper ${className}`} {...props}>
      {value}
    </Tag>
  );
}
