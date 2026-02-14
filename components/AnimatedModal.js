import { motion, AnimatePresence } from 'framer-motion';

/**
 * 带有framer-motion动画的模态框组件
 * @param {Object} backdropProps - 背景属性
 * @param {Object} modalProps - 模态框属性
 * @param {boolean} isOpen - 是否打开
 * @param {Function} onClose - 关闭回调
 * @param {ReactNode} children - 子元素
 */
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  backdropProps = {},
  modalProps = {}
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop-animated"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          {...backdropProps}
        >
          <motion.div
            className="modal-content-animated"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: '20%' }}
            animate={{ scale: 1, opacity: 1, y: '0%' }}
            exit={{ scale: 0.95, opacity: 0, y: '20%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            {...modalProps}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 移动端从底部滑入的模态框
 */
export function SlideUpModal({
  isOpen,
  onClose,
  children,
  backdropProps = {},
  modalProps = {}
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop-animated"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          {...backdropProps}
        >
          <motion.div
            className="modal-content-animated"
            onClick={(e) => e.stopPropagation()}
            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: '0%' } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            {...modalProps}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
