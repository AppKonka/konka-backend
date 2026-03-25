// src/modules/fan/pages/OrderTracking.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const OrderInfo = styled.div`
  background: ${props => props.theme.surface};
  padding: 16px;
  margin: 16px;
  border-radius: 16px;
`

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
`

const OrderId = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const OrderStatus = styled.span`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB44420';
      case 'confirmed': return '#33B5E520';
      case 'shipped': return '#FF6B3520';
      case 'delivered': return '#00C85120';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB444';
      case 'confirmed': return '#33B5E5';
      case 'shipped': return '#FF6B35';
      case 'delivered': return '#00C851';
      default: return '#888888';
    }
  }};
`

const OrderDate = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const OrderTotal = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.border};
`

const TrackingSection = styled.div`
  background: ${props => props.theme.surface};
  margin: 16px;
  border-radius: 16px;
  overflow: hidden;
`

const TrackingHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
  font-weight: 600;
`

const TrackingMap = styled.div`
  height: 250px;
  background: ${props => props.theme.border};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const TrackingSteps = styled.div`
  padding: 16px;
`

const Step = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  position: relative;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 16px;
    top: 32px;
    width: 2px;
    height: calc(100% - 12px);
    background: ${props => props.active ? props.theme.primary : props.theme.border};
  }
`

const StepIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: ${props => props.active ? props.theme.primary : props.theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  z-index: 1;
`

const StepContent = styled.div`
  flex: 1;
`

const StepTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.active ? props.theme.primary : props.theme.text};
`

const StepDate = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const StepLocation = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const ProductsList = styled.div`
  background: ${props => props.theme.surface};
  margin: 16px;
  border-radius: 16px;
  padding: 16px;
`

const ProductItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const ProductImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
`

const ProductInfo = styled.div`
  flex: 1;
`

const ProductName = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const ProductQuantity = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const ProductPrice = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const SupportButton = styled(motion.button)`
  width: calc(100% - 32px);
  margin: 16px;
  padding: 14px;
  border-radius: 28px;
  border: 1px solid ${props => props.theme.primary};
  background: transparent;
  color: ${props => props.theme.primary};
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
`

const OrderTracking = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [order, setOrder] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    try {
      // Charger la commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*)
          )
        `)
        .eq('id', orderId)
        .single()
      
      if (orderError) throw orderError
      setOrder(orderData)
      
      // Charger le suivi
      const { data: trackingData } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true })
      
      setTracking(trackingData || [])
      
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente de paiement'
      case 'confirmed': return 'Confirmée'
      case 'shipped': return 'Expédiée'
      case 'delivered': return 'Livrée'
      default: return status
    }
  }

  const getStepStatus = (step, currentStatus) => {
    const steps = ['pending', 'confirmed', 'shipped', 'delivered']
    const currentIndex = steps.indexOf(currentStatus)
    const stepIndex = steps.indexOf(step)
    return stepIndex <= currentIndex
  }

  const getStepIcon = (step, active) => {
    if (active) {
      switch (step) {
        case 'pending': return '🕐'
        case 'confirmed': return '✅'
        case 'shipped': return '📦'
        case 'delivered': return '🏠'
        default: return '●'
      }
    }
    return '○'
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 'pending': return 'Commande en attente'
      case 'confirmed': return 'Commande confirmée'
      case 'shipped': return 'Commande expédiée'
      case 'delivered': return 'Commande livrée'
      default: return step
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Container>
        <Header title="Suivi commande" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  if (!order) {
    return (
      <Container>
        <Header title="Suivi commande" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Commande non trouvée</div>
        <BottomNavigation />
      </Container>
    )
  }

  const steps = ['pending', 'confirmed', 'shipped', 'delivered']

  return (
    <Container>
      <Header title="Suivi commande" showBack />
      
      <OrderInfo>
        <OrderHeader>
          <OrderId>Commande #{order.id.slice(-8)}</OrderId>
          <OrderStatus status={order.status}>
            {getStatusText(order.status)}
          </OrderStatus>
        </OrderHeader>
        <OrderDate>Passée le {formatDate(order.created_at)}</OrderDate>
        <OrderTotal>Total: {order.total_amount}€</OrderTotal>
      </OrderInfo>
      
      <TrackingSection>
        <TrackingHeader>Suivi de livraison</TrackingHeader>
        
        <TrackingMap>
          {/* Intégration Google Maps pour le suivi en temps réel */}
          <div style={{ textAlign: 'center', color: '#888' }}>
            🗺️ Carte de suivi<br />
            {order.tracking_number && `N° de suivi: ${order.tracking_number}`}
          </div>
        </TrackingMap>
        
        <TrackingSteps>
          {steps.map((step) => {
            const active = getStepStatus(step, order.status)
            return (
              <Step key={step} active={active}>
                <StepIcon active={active}>
                  {getStepIcon(step, active)}
                </StepIcon>
                <StepContent>
                  <StepTitle active={active}>
                    {getStepTitle(step)}
                  </StepTitle>
                  {active && tracking && tracking.find(t => t.status === step) && (
                    <>
                      <StepDate>
                        {formatDate(tracking.find(t => t.status === step)?.timestamp)}
                      </StepDate>
                      {tracking.find(t => t.status === step)?.location && (
                        <StepLocation>
                          📍 {tracking.find(t => t.status === step)?.location}
                        </StepLocation>
                      )}
                    </>
                  )}
                </StepContent>
              </Step>
            )
          })}
        </TrackingSteps>
      </TrackingSection>
      
      <ProductsList>
        <h4 style={{ marginBottom: 12 }}>Produits commandés</h4>
        {order.items?.map((item, idx) => (
          <ProductItem key={idx}>
            <ProductImage src={item.product?.images?.[0] || '/images/default-product.jpg'} />
            <ProductInfo>
              <ProductName>{item.product?.name}</ProductName>
              <ProductQuantity>x{item.quantity}</ProductQuantity>
            </ProductInfo>
            <ProductPrice>{item.price_at_time * item.quantity}€</ProductPrice>
          </ProductItem>
        ))}
      </ProductsList>
      
      <SupportButton
        onClick={() => navigate(`/fan/contact?order=${order.id}`)}
        whileTap={{ scale: 0.98 }}
      >
          Besoin d'aide ? Contacter le support
      </SupportButton>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default OrderTracking