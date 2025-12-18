import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000, set to 0 to persist
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message.duration === 0) return; // 不自動關閉
    
    const timer = setTimeout(() => {
      onClose(message.id);
    }, message.duration || 4000);
    
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[message.type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }[message.type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[message.type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }[message.type];

  return (
    <div
      className={`${bgColor} border rounded-lg p-4 mb-3 flex items-start gap-3 shadow-md animate-fade-in`}
      role="alert"
    >
      <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
      <div className="flex-grow">
        <h3 className={`${textColor} font-semibold`}>{message.title}</h3>
        {message.message && (
          <p className={`${textColor} text-sm mt-1 opacity-90`}>{message.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(message.id)}
        className={`${textColor} opacity-50 hover:opacity-100 transition flex-shrink-0`}
        aria-label="關閉"
      >
        <X size={18} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

/**
 * 全域 Toast 容器元件
 * 應在 App.tsx 頂層使用，配合 useToast hook
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onClose }) => {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 max-w-sm z-50">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onClose={onClose} />
      ))}
    </div>
  );
};

/**
 * 全域 Toast 狀態管理 Hook
 * 使用方式：
 *   const { messages, addToast, removeToast } = useToast();
 *   addToast('success', '成功', '操作已完成');
 */
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration?: number
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration: duration ?? 4000,
      };
      setMessages((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const remove = removeToast; // alias

  return {
    messages,
    addToast,
    removeToast,
    remove,
  };
};
