// src/modules/fan/pages/Profile.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { useTheme } from '../../shared/context/ThemeContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const CoverImage = styled.div`
  height: 200px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  position: relative;
`

const ProfileHeader = styled.div`
  position: relative;
  padding: 0 16px;
`

const AvatarWrapper = styled.div`
  position: absolute;
  top: -60px;
  left: 16px;
  border: 4px solid ${props => props.theme.background};
  border-radius: 50%;
`

const EditButton = styled(motion.button)`
  position: absolute;
  top: 10px;
  right: 16px;
  background: ${props => props.theme.surface};
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: ${props => props.theme.text};
  box-shadow: ${props => props.theme.shadow.sm};
`

const ProfileInfo = styled.div`
  margin-top: 70px;
  margin-bottom: 20px;
`

const Name = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const Username = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const Bio = styled.p`
  font-size: 14px;
  color: ${props => props.theme.text};
  line-height: 1.4;
  margin-bottom: 16px;
`

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px 0;
  border-top: 1px solid ${props => props.theme.border};
  border-bottom: 1px solid ${props => props.theme.border};
`

const StatItem = styled(motion.div)`
  flex: 1;
  text-align: center;
  cursor: pointer;
`

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const XPBar = styled.div`
  margin-bottom: 20px;
`

const XPHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

const XPProgress = styled.div`
  height: 8px;
  background: ${props => props.theme.border};
  border-radius: 4px;
  overflow: hidden;
`

const XPProgressFill = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background: linear-gradient(90deg, #FF6B35, #FF4D1E);
  border-radius: 4px;
`

const BadgesContainer = styled.div`
  margin-bottom: 20px;
`

const BadgesTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const BadgesList = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const Badge = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => props.theme.text};
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const Tab = styled(motion.button)`
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  cursor: pointer;
`

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
`

const PostItem = styled(motion.div)`
  aspect-ratio: 1;
  background: ${props => props.theme.surface};
  overflow: hidden;
  position: relative;
  cursor: pointer;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PlayIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
`

const SparksRow = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 16px 0;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const SparkItem = styled(motion.div)`
  width: 80px;
  text-align: center;
  cursor: pointer;
`

const SparkCircle = styled.div`
  width: 68px;
  height: 68px;
  border-radius: 34px;
  background: ${props => props.viewed ? props.theme.border : `linear-gradient(135deg, #FF6B35, #FF4D1E)`};
  padding: 2px;
  margin-bottom: 6px;
  
  .inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: ${props => props.theme.background};
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

const Profile = () => {
  const navigate = useNavigate()
  const { user, userProfile, updateProfile } = useAuth()
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [sparks, setSparks] = useState([])
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    matches: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    setLoading(true)
    try {
      // Charger les posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      
      setPosts(postsData || [])

      // Charger les sparks
      const { data: sparksData } = await supabase
        .from('sparks')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      
      setSparks(sparksData || [])

      // Charger les stats
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
      
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
      
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'matched')
      
      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        matches: matchesCount || 0,
      })
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditProfile = () => {
    navigate('/fan/profile/edit')
  }

  const handleStatClick = (type) => {
    if (type === 'followers') {
      navigate('/fan/profile/followers')
    } else if (type === 'following') {
      navigate('/fan/profile/following')
    } else if (type === 'matches') {
      navigate('/fan/messages')
    }
  }

  const handlePostClick = (post) => {
    navigate(`/fan/post/${post.id}`)
  }

  const handleSparkClick = (spark) => {
    navigate(`/fan/spark/${spark.id}`)
  }

  return (
    <Container>
      <Header title="Mon Profil" showBack={false} showProfile={false} />
      
      <CoverImage>
        <EditButton onClick={handleEditProfile} whileTap={{ scale: 0.95 }}>
          Modifier le profil
        </EditButton>
      </CoverImage>
      
      <ProfileHeader>
        <AvatarWrapper>
          <Avatar
            src={userProfile?.avatar_url}
            name={userProfile?.display_name}
            size={100}
          />
        </AvatarWrapper>
        
        <ProfileInfo>
          <Name>{userProfile?.display_name}</Name>
          <Username>@{userProfile?.username}</Username>
          {userProfile?.bio && <Bio>{userProfile.bio}</Bio>}
        </ProfileInfo>
        
        <StatsContainer>
          <StatItem onClick={() => handleStatClick('followers')} whileTap={{ scale: 0.95 }}>
            <StatValue>{stats.followers}</StatValue>
            <StatLabel>Abonnés</StatLabel>
          </StatItem>
          <StatItem onClick={() => handleStatClick('following')} whileTap={{ scale: 0.95 }}>
            <StatValue>{stats.following}</StatValue>
            <StatLabel>Abonnements</StatLabel>
          </StatItem>
          <StatItem onClick={() => handleStatClick('matches')} whileTap={{ scale: 0.95 }}>
            <StatValue>{stats.matches}</StatValue>
            <StatLabel>Smatches</StatLabel>
          </StatItem>
        </StatsContainer>
        
        <XPBar>
          <XPHeader>
            <span>Niveau {Math.floor(userProfile?.xp_points / 1000) || 1}</span>
            <span>{userProfile?.xp_points || 0} XP</span>
          </XPHeader>
          <XPProgress>
            <XPProgressFill progress={(userProfile?.xp_points % 1000) / 10} />
          </XPProgress>
        </XPBar>
        
        <BadgesContainer>
          <BadgesTitle>Badges</BadgesTitle>
          <BadgesList>
            <Badge whileTap={{ scale: 0.95 }}>
              <span>🎵</span> Music Lover
            </Badge>
            <Badge whileTap={{ scale: 0.95 }}>
              <span>🔥</span> Fan fidèle
            </Badge>
            <Badge whileTap={{ scale: 0.95 }}>
              <span>✨</span> Créateur
            </Badge>
          </BadgesList>
        </BadgesContainer>
        
        <TabsContainer>
          <Tab
            active={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </Tab>
          <Tab
            active={activeTab === 'sparks'}
            onClick={() => setActiveTab('sparks')}
          >
            Sparks
          </Tab>
        </TabsContainer>
        
        <AnimatePresence mode="wait">
          {activeTab === 'posts' ? (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PostsGrid>
                {posts.map(post => (
                  <PostItem
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {post.media_urls && (
                      <>
                        <img src={post.media_urls[0]} alt={post.caption} />
                        {post.type === 'video' && <PlayIcon>▶️</PlayIcon>}
                      </>
                    )}
                  </PostItem>
                ))}
              </PostsGrid>
              {posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  Aucun post pour le moment
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="sparks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SparksRow>
                {sparks.map(spark => (
                  <SparkItem
                    key={spark.id}
                    onClick={() => handleSparkClick(spark)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <SparkCircle viewed={spark.viewed}>
                      <div className="inner">
                        {spark.type === 'live' ? '🔴' : 
                         spark.type === 'photo' ? '📷' : '🎥'}
                      </div>
                    </SparkCircle>
                    <span style={{ fontSize: 12 }}>
                      {new Date(spark.created_at).toLocaleDateString()}
                    </span>
                  </SparkItem>
                ))}
              </SparksRow>
              {sparks.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  Aucun Spark pour le moment
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ProfileHeader>
      
      <BottomNavigation />
    </Container>
  )
}

export default Profile