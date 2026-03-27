// src/modules/fan/pages/PostDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
`

const PostImage = styled.div`
  width: 100%;
  background: ${props => props.theme.border};
  
  img {
    width: 100%;
    height: auto;
    display: block;
  }
`

const PostContent = styled.div`
  padding: 16px;
`

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

const PostInfo = styled.div`
  flex: 1;
`

const PostUsername = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const PostTime = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const PostCaption = styled.p`
  font-size: 15px;
  line-height: 1.4;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const PostStats = styled.div`
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid ${props => props.theme.border};
  border-bottom: 1px solid ${props => props.theme.border};
  margin-bottom: 16px;
`

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const Actions = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
`

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  
  span {
    font-size: 14px;
  }
`

const CommentsSection = styled.div`
  margin-top: 16px;
`

const CommentInput = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`

const CommentInputField = styled.input`
  flex: 1;
  padding: 12px;
  border-radius: 24px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
`

const CommentContent = styled.div`
  flex: 1;
`

const CommentHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
`

const CommentUsername = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.theme.text};
`

const CommentTime = styled.span`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
`

const CommentText = styled.p`
  font-size: 14px;
  line-height: 1.4;
  color: ${props => props.theme.text};
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const PostDetail = () => {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('id', postId)
        .single()
      
      if (error) throw error
      setPost(data)
      
      // Vérifier si l'utilisateur a liké
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        setLiked(likeData && likeData.length > 0)
      }
      
      console.log('📝 Post chargé:', {
        postId,
        author: data.user?.username,
        likes: data.like_count,
        comments: data.comment_count
      })
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Erreur lors du chargement de la publication')
      navigate('/fan/home')
    }
  }, [postId, user, navigate])

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setComments(data || [])
      
      console.log('💬 Commentaires chargés:', data?.length)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadPost()
    loadComments()
  }, [loadPost, loadComments])

  const handleLike = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      if (liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        setPost(prev => ({ ...prev, like_count: prev.like_count - 1 }))
        setLiked(false)
        console.log('❤️ Like retiré:', postId)
      } else {
        const { data, error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
            created_at: new Date().toISOString()
          })
          .select()
        
        if (error) throw error
        
        setPost(prev => ({ ...prev, like_count: prev.like_count + 1 }))
        setLiked(true)
        console.log('❤️ Like ajouté:', {
          postId,
          likeId: data?.[0]?.id
        })
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Erreur lors de l\'opération')
    }
  }

  const handleComment = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    if (!newComment.trim()) {
      toast.error('Veuillez écrire un commentaire')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment,
          created_at: new Date().toISOString()
        })
        .select('*, user:users(id, username, avatar_url)')
        .single()
      
      if (error) throw error
      
      setComments(prev => [data, ...prev])
      setNewComment('')
      setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }))
      
      toast.success('Commentaire ajouté !')
      console.log('💬 Commentaire ajouté:', {
        postId,
        commentId: data.id,
        content: newComment
      })
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error('Erreur lors de l\'ajout du commentaire')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/fan/post/${postId}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Lien copié dans le presse-papier !')
    console.log('🔗 Lien partagé:', shareUrl)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Publication" showBack />
        <LoadingSpinner>
          <div>Chargement de la publication...</div>
        </LoadingSpinner>
      </Container>
    )
  }

  if (!post) {
    return (
      <Container>
        <Header title="Publication" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div>Publication non trouvée</div>
          <Button onClick={() => navigate('/fan/home')} style={{ marginTop: 20 }}>
            Retour à l'accueil
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Publication" showBack />
      
      {post.type === 'image' && post.media_urls && post.media_urls[0] && (
        <PostImage>
          <img src={post.media_urls[0]} alt={post.caption || 'Publication'} />
        </PostImage>
      )}
      
      <PostContent>
        <PostHeader>
          <Avatar
            src={post.user?.avatar_url}
            name={post.user?.username}
            size={44}
            onClick={() => navigate(`/fan/profile/${post.user_id}`)}
          />
          <PostInfo>
            <PostUsername onClick={() => navigate(`/fan/profile/${post.user_id}`)}>
              @{post.user?.username}
            </PostUsername>
            <PostTime>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
            </PostTime>
          </PostInfo>
        </PostHeader>
        
        {post.caption && <PostCaption>{post.caption}</PostCaption>}
        
        <PostStats>
          <StatItem>❤️ {post.like_count}</StatItem>
          <StatItem>💬 {post.comment_count}</StatItem>
          <StatItem>🔁 {post.share_count}</StatItem>
        </PostStats>
        
        <Actions>
          <ActionButton onClick={handleLike} whileTap={{ scale: 0.9 }} active={liked}>
            {liked ? '❤️' : '🤍'} <span>J'aime</span>
          </ActionButton>
          <ActionButton whileTap={{ scale: 0.9 }}>
            💬 <span>Commenter</span>
          </ActionButton>
          <ActionButton onClick={handleShare} whileTap={{ scale: 0.9 }}>
            🔁 <span>Partager</span>
          </ActionButton>
        </Actions>
        
        <CommentsSection>
          <CommentInput>
            <Avatar
              src={user?.user_metadata?.avatar_url}
              name={user?.email}
              size={36}
            />
            <CommentInputField
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleComment()}
            />
            <Button onClick={handleComment} disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </CommentInput>
          
          <CommentList>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                Aucun commentaire pour le moment
              </div>
            ) : (
              comments.map(comment => (
                <CommentItem key={comment.id}>
                  <Avatar
                    src={comment.user?.avatar_url}
                    name={comment.user?.username}
                    size={32}
                  />
                  <CommentContent>
                    <CommentHeader>
                      <CommentUsername>@{comment.user?.username}</CommentUsername>
                      <CommentTime>
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                      </CommentTime>
                    </CommentHeader>
                    <CommentText>{comment.content}</CommentText>
                  </CommentContent>
                </CommentItem>
              ))
            )}
          </CommentList>
        </CommentsSection>
      </PostContent>
    </Container>
  )
}

export default PostDetail