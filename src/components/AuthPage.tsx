import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, UserPlus } from 'lucide-react'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        alert('注册成功！请检查邮箱验证链接')
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="max-w-md w-full">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-h1 font-bold text-neutral-900 mb-2">蹭饭地图</h1>
          <p className="text-body text-neutral-700">记录大学同学的足迹，让友谊跨越山海</p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-10 border border-neutral-200">
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 rounded-md font-medium transition-all ${
                !isSignUp
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 rounded-md font-medium transition-all ${
                isSignUp
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-small font-medium text-neutral-700 mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-small font-medium text-neutral-700 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="至少6位字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-error rounded-md p-3">
                <p className="text-small text-error">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              className="w-full btn-primary flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span>处理中...</span>
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>注册账号</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>登录</span>
                </>
              )}
            </button>
          </form>

          {/* 提示文字 */}
          <div className="mt-6 text-center">
            <p className="text-caption text-neutral-400">
              {isSignUp
                ? '注册后需要验证邮箱才能登录'
                : '还没有账号？点击上方"注册"按钮'}
            </p>
          </div>
        </div>

        {/* 页脚说明 */}
        <div className="mt-8 text-center">
          <p className="text-small text-neutral-400">
            使用本服务即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  )
}
