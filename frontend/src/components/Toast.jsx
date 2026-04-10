import { useEffect, useState } from 'react'

export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'border-green-500/50 bg-green-500/10 text-green-400',
    error:   'border-red-500/50 bg-red-500/10 text-red-400',
    info:    'border-[#dc2626]/50 bg-[#dc2626]/10 text-[#ef4444]',
  }

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3
      rounded-xl border backdrop-blur-sm
      shadow-lg shadow-black/30
      ${styles[type]}
    `}>
      {type === 'success' && <span className="text-lg">✓</span>}
      {type === 'error'   && <span className="text-lg">✕</span>}
      {type === 'info'    && <span className="text-lg">ℹ</span>}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
  }

  const removeToast = (id) => {
    setToasts(t => t.filter(toast => toast.id !== id))
  }

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )

  return { addToast, ToastContainer }
}
