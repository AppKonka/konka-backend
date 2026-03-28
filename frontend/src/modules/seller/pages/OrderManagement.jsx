// src/modules/seller/pages/OrderManagement.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderSection = styled.div`
  padding: 16px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin: 0 16px 16px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  justify-content: space-around;
`

const StatItem = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  overflow-x: auto;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const Tab = styled(motion.button)`
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  white-space: nowrap;
  cursor: pointer;
`

const OrdersList = styled.div`
  padding: 16px;
`

const OrderCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const OrderId = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const OrderDate = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const BuyerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`

const ProductsList = styled.div`
  margin-bottom: 16px;
`

const ProductItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

const ProductImage = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
`

const ProductDetails = styled.div`
  flex: 1;
`

const ProductName = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const ProductPrice = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const OrderTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.border};
  margin-bottom: 16px;
`

const TotalLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const TotalAmount = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const OrderActions = styled.div`
  display: flex;
  gap: 12px;
`

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 10px;
  border-radius: 24px;
  border: none;
  background: ${props => props.primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.primary ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const TrackingModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
`

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
`

const ModalBody = styled.div`
  padding: 20px;
`

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
`

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB44420';
      case 'confirmed': return '#33B5E520';
      case 'shipped': return '#FF6B3520';
      case 'delivered': return '#00C85120';
      case 'disputed': return '#FF444420';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB444';
      case 'confirmed': return '#33B5E5';
      case 'shipped': return '#FF6B35';
      case 'delivered': return '#00C851';
      case 'disputed': return '#FF4444';
      default: return '#888888';
    }
  }};
`

const tabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmées' },
  { id: 'shipped', label: 'Expédiées' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'disputed', label: 'Litiges' },
]

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
`

const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuth()

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Récupérer les produits du vendeur
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id)
      
      if (productsError) throw productsError
      
      const productIds = products?.map(p => p.id) || []
      
      if (productIds.length === 0) {
        setOrders([])
        setLoading(false)
        console.log('📦 Aucun produit trouvé pour ce vendeur')
        return
      }
      
      // Récupérer les order_items avec les produits du vendeur
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(*, buyer:users(id, username, avatar_url)),
          product:products(*)
        `)
        .in('product_id', productIds)
      
      if (itemsError) throw itemsError
      
      if (orderItems && orderItems.length > 0) {
        // Regrouper par order_id
        const ordersMap = new Map()
        orderItems.forEach(item => {
          const order = item.order
          if (!ordersMap.has(order.id)) {
            ordersMap.set(order.id, {
              ...order,
              items: [],
              sellerItems: [],
            })
          }
          const orderData = ordersMap.get(order.id)
          orderData.items.push(item)
          if (item.product.seller_id === user.id) {
            orderData.sellerItems.push(item)
          }
        })
        
        let ordersArray = Array.from(ordersMap.values())
        
        // Filtrer par statut
        if (activeTab !== 'all') {
          ordersArray = ordersArray.filter(o => o.status === activeTab)
        }
        
        // Trier par date
        ordersArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        
        setOrders(ordersArray)
        
        console.log('📦 Commandes chargées:', {
          total: ordersArray.length,
          activeTab,
          productCount: productIds.length
        })
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }, [user.id, activeTab])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleUpdateStatus = async (orderId, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
      
      if (error) throw error
      
      toast.success(`Commande ${status === 'confirmed' ? 'confirmée' : status === 'delivered' ? 'marquée livrée' : 'mise à jour'}`)
      console.log('📦 Statut commande mis à jour:', { orderId, status })
      loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleShipOrder = async () => {
    if (!trackingNumber.trim() || !selectedOrder) return
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: trackingNumber,
          shipped_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .select()
      
      if (error) throw error
      
      toast.success(`Commande #${selectedOrder.id.slice(-8)} expédiée avec succès`)
      console.log('📦 Commande expédiée:', {
        orderId: selectedOrder.id,
        trackingNumber,
        shippedAt: new Date().toISOString()
      })
      
      setShowTrackingModal(false)
      setTrackingNumber('')
      setSelectedOrder(null)
      loadOrders()
    } catch (error) {
      console.error('Error shipping order:', error)
      toast.error('Erreur lors de l\'expédition')
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

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente de paiement'
      case 'confirmed': return 'Confirmée'
      case 'shipped': return 'Expédiée'
      case 'delivered': return 'Livrée'
      case 'disputed': return 'Litige'
      default: return 'Inconnu'
    }
  }

  // Calculer les statistiques
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    disputed: orders.filter(o => o.status === 'disputed').length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Commandes" showProfile showBack />
        <LoadingSpinner>
          <div>Chargement des commandes...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Commandes" showProfile showBack />
      
      <HeaderSection>
        <Title>Commandes</Title>
        <Subtitle>Gérez les commandes de vos clients</Subtitle>
      </HeaderSection>
      
      {orders.length > 0 && (
        <StatsBar>
          <StatItem>
            <StatValue>{stats.total}</StatValue>
            <StatLabel>Total</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.pending}</StatValue>
            <StatLabel>En attente</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.shipped}</StatValue>
            <StatLabel>Expédiées</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.totalRevenue.toLocaleString()}€</StatValue>
            <StatLabel>Chiffre d'affaires</StatLabel>
          </StatItem>
        </StatsBar>
      )}
      
      <TabsContainer>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span style={{ marginLeft: 4 }}>
                ({stats[tab.id] || 0})
              </span>
            )}
          </Tab>
        ))}
      </TabsContainer>
      
      <OrdersList>
        {orders.length === 0 ? (
          <EmptyState>
            <div className="icon">📦</div>
            <div>Aucune commande</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {activeTab === 'all' && "Les commandes apparaîtront ici une fois que vous aurez des ventes"}
              {activeTab === 'pending' && "Aucune commande en attente"}
              {activeTab === 'confirmed' && "Aucune commande confirmée"}
              {activeTab === 'shipped' && "Aucune commande expédiée"}
              {activeTab === 'delivered' && "Aucune commande livrée"}
              {activeTab === 'disputed' && "Aucun litige en cours"}
            </div>
          </EmptyState>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id}>
              <OrderHeader>
                <OrderId>#{order.id.slice(-8)}</OrderId>
                <OrderDate>{formatDate(order.created_at)}</OrderDate>
              </OrderHeader>
              
              <BuyerInfo>
                <Avatar
                  src={order.buyer?.avatar_url}
                  name={order.buyer?.username}
                  size={40}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>@{order.buyer?.username}</div>
                  <StatusBadge status={order.status}>
                    {getStatusText(order.status)}
                  </StatusBadge>
                </div>
              </BuyerInfo>
              
              <ProductsList>
                {order.sellerItems?.map((item, idx) => (
                  <ProductItem key={idx}>
                    <ProductImage src={item.product?.images?.[0] || '/images/default-product.jpg'} />
                    <ProductDetails>
                      <ProductName>{item.product?.name}</ProductName>
                      <ProductPrice>
                        {item.quantity} x {item.price_at_time}€
                      </ProductPrice>
                    </ProductDetails>
                  </ProductItem>
                ))}
              </ProductsList>
              
              <OrderTotal>
                <TotalLabel>Total</TotalLabel>
                <TotalAmount>{order.total_amount}€</TotalAmount>
              </OrderTotal>
              
              <OrderActions>
                {order.status === 'pending' && (
                  <ActionButton
                    primary
                    onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                    whileTap={{ scale: 0.95 }}
                  >
                    Confirmer
                  </ActionButton>
                )}
                
                {order.status === 'confirmed' && (
                  <ActionButton
                    primary
                    onClick={() => {
                      setSelectedOrder(order)
                      setShowTrackingModal(true)
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Expédier
                  </ActionButton>
                )}
                
                {order.status === 'shipped' && (
                  <ActionButton
                    primary
                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                    whileTap={{ scale: 0.95 }}
                  >
                    Marquer livrée
                  </ActionButton>
                )}
                
                {order.status === 'disputed' && (
                  <ActionButton
                    primary
                    whileTap={{ scale: 0.95 }}
                  >
                    Voir litige
                  </ActionButton>
                )}
                
                <ActionButton
                  onClick={() => window.open(`/chat/${order.buyer_id}`, '_blank')}
                  whileTap={{ scale: 0.95 }}
                >
                  💬 Contacter
                </ActionButton>
              </OrderActions>
            </OrderCard>
          ))
        )}
      </OrdersList>
      
      <MusicPlayer />
      <BottomNavigation />
      
      {showTrackingModal && selectedOrder && (
        <TrackingModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowTrackingModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>Expédier la commande</ModalTitle>
              <button onClick={() => setShowTrackingModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <p style={{ marginBottom: 16 }}>
                Commande #{selectedOrder.id.slice(-8)} pour @{selectedOrder.buyer?.username}
              </p>
              <Input
                type="text"
                placeholder="Numéro de suivi (optionnel)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                Vous pourrez ajouter un numéro de suivi plus tard
              </p>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowTrackingModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleShipOrder}
              >
                Confirmer l'expédition
              </Button>
            </ModalFooter>
          </ModalContent>
        </TrackingModal>
      )}
    </Container>
  )
}

export default OrderManagement