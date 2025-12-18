/**
 * Toast 全域狀態輔助工具
 * 在元件中使用：
 *   const toast = getGlobalToast();
 *   toast.addToast('success', '成功', '操作已完成');
 */
export function getGlobalToast() {
  const t = (window as any).__appToast;
  if (!t) {
    console.warn('[Toast] Global toast not initialized');
    return {
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return t;
}
