import React from 'react'
import './main.css'

interface StarfieldBackgroundProps {
  theme?: 'mono' | 'blue'
}

const StarfieldBackground: React.FC<StarfieldBackgroundProps> = ({ theme = 'blue' }) => {
  return (
    <div className={`starfield-container ${theme === 'mono' ? 'sf-mono' : 'sf-blue'}`}>
      <div id="stars" />
      <div id="stars2" />
      <div id="stars3" />
    </div>
  )
}

export default StarfieldBackground
