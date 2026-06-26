import React from 'react'

interface CyberCardProps {
  title?: string
  subtitle?: string
  highlight?: string
  prompt?: string
  className?: string
}

const TRACKERS = Array.from({ length: 25 }, (_, i) => `cc-tr-${i + 1}`)

export function CyberCard({
  title = 'CYBER\nCARD',
  subtitle = 'AI',
  highlight = 'Panel Studio',
  prompt = 'HOVER ME',
  className = '',
}: CyberCardProps) {
  return (
    <div className={`cc-container ${className}`}>
      <div className="cc-canvas">
        {TRACKERS.map((tr) => (
          <div key={tr} className={`cc-tracker ${tr}`} />
        ))}
        <div className="cc-card">
          <div className="cc-card-content">
            <div className="cc-card-glare" />
            <div className="cc-cyber-lines">
              <span /><span /><span /><span />
            </div>
            <p className="cc-prompt">{prompt}</p>
            <div className="cc-title">
              {title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </div>
            <div className="cc-glowing-elements">
              <div className="cc-glow-1" />
              <div className="cc-glow-2" />
              <div className="cc-glow-3" />
            </div>
            <div className="cc-subtitle">
              <span>{subtitle}</span>
              <span className="cc-highlight">{highlight}</span>
            </div>
            <div className="cc-card-particles">
              <span /><span /><span /><span /><span /><span />
            </div>
            <div className="cc-corner-elements">
              <span /><span /><span /><span />
            </div>
            <div className="cc-scan-line" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CyberCard
