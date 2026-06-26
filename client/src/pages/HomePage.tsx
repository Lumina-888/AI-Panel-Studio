import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import StarfieldBackground from '../components/background/main'
import { HamsterLoader } from '../components/common/HamsterLoader'
import { CyberCard } from '../components/common/CyberCard'
import { ExpandCard } from '../components/common/ExpandCard'
import { HomeDiscussionPreview } from '../components/discussion/HomeDiscussionPreview'

export function HomePage() {
  const { fetchDiscussions } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* 星空背景 */}
      <StarfieldBackground theme="mono" />

      {/* 内容层 */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 py-12 min-h-[100dvh] flex flex-col justify-center">
        {/* 右上角仓鼠 */}
        <div className="absolute top-6 right-6 md:top-10 md:right-12 z-20 opacity-70 hover:opacity-100 transition-opacity">
          <HamsterLoader />
        </div>

        {/* 两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* 左栏：讨论预览 */}
          <div>
            <HomeDiscussionPreview />
          </div>

          {/* 右栏：项目介绍 + 发起新讨论 */}
          <div className="flex flex-col gap-8">
            <ExpandCard
              title="AI Panel Studio"
              description="AI 驱动的圆桌讨论平台。输入话题，动态生成主持人加专家阵群，实时多视角辩论，共识与分歧可视化追踪。深色演播厅主题，科技感十足。"
            />

            <div className="flex justify-center lg:justify-start">
              <button
                onClick={() => navigate('/discussions')}
                className="cursor-pointer"
              >
                <CyberCard
                  title="发起新讨论"
                  prompt="开始"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
