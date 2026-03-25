// src/modules/fan/components/Sparks/SparkStory.jsx
import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Avatar } from '../../../shared/components/ui/Avatar'

const StoryContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`

const StoryRing = styled.div`
  width: 68px;
  height: 68px;
  border-radius: 34px;
  background: ${props => props.hasUnseen ? `linear-gradient(135deg, #FF6B35, #FF4D1E)` : props.theme.border};
  padding: 2px;
  
  .inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: ${props => props.theme.background};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
`

const StoryName = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 6px;
  text-align: center;
  max-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LiveBadge = styled.div`
  position: relative;
  top: -10px;
  right: -25px;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #FF4444;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s infinite;
  
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
  }
`

export const SparkStory = ({ story, onClick, hasUnseen = false }) => {
  return (
    <StoryContainer onClick={onClick} whileTap={{ scale: 0.95 }}>
      <div style={{ position: 'relative' }}>
        <StoryRing hasUnseen={hasUnseen}>
          <div className="inner">
            {story.user?.avatar_url ? (
              <img src={story.user.avatar_url} alt={story.user?.username} />
            ) : (
              <Avatar name={story.user?.username} size={64} />
            )}
          </div>
        </StoryRing>
        {story.is_live && <LiveBadge>🔴</LiveBadge>}
      </div>
      <StoryName>{story.user?.username}</StoryName>
    </StoryContainer>
  )
}