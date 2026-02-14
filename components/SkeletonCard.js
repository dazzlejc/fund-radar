/**
 * 骨架屏组件 - 用于加载状态的占位符
 */

export function SkeletonCard() {
  return (
    <article className="skeleton-card" aria-hidden="true">
      <header className="skeleton-header">
        <div className="skeleton-info">
          <div className="skeleton-title"></div>
          <div className="skeleton-code"></div>
          <div className="skeleton-tags">
            <div className="skeleton-tag"></div>
            <div className="skeleton-tag"></div>
          </div>
        </div>
        <div className="skeleton-actions">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </header>

      <div className="skeleton-data">
        <div className="skeleton-row">
          <div className="skeleton-label"></div>
          <div className="skeleton-value"></div>
        </div>
        <div className="skeleton-row">
          <div className="skeleton-label"></div>
          <div className="skeleton-value"></div>
        </div>
        <div className="skeleton-meta">
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
        </div>
      </div>

      <div className="skeleton-holdings">
        <div className="skeleton-row">
          <div className="skeleton-label"></div>
          <div className="skeleton-value"></div>
        </div>
        <div className="skeleton-row">
          <div className="skeleton-label"></div>
          <div className="skeleton-value"></div>
        </div>
      </div>

      <div className="skeleton-actions-bottom">
        <div className="skeleton-button-wide"></div>
        <div className="skeleton-button-wide"></div>
        <div className="skeleton-button-wide"></div>
      </div>
    </article>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton-text-line"
          style={{
            width: index === lines - 1 ? '70%' : '100%'
          }}
        ></div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ height = '100px' }) {
  return <div className="skeleton-block" style={{ height }} aria-hidden="true"></div>;
}
