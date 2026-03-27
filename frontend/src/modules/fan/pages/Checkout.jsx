// src/modules/fan/pages/Checkout.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 40px;
`

const Section = styled.div`
  background: ${props => props.theme.surface};
  margin-bottom: 12px;
  padding: 16px;
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const CartItemsList = styled.div`
  margin-bottom: 16px;
`

const CartItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`

const ItemImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
`

const ItemDetails = styled.div`
  flex: 1;
`

const ItemName = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ItemPrice = styled.div`
  font-size: 14px;
  color: ${props => props.theme.primary};
`

const ItemQuantity = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const Totals = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.border};
`

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
    font-weight: 700;
    font-size: 18px;
    color: ${props => props.theme.primary};
  }
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
`

const PaymentMethods = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const PaymentMethod = styled(motion.div)`
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid ${props => props.selected ? props.theme.primary : props.theme.border};
  background: ${props => props.selected ? `${props.theme.primary}10` : props.theme.surface};
  text-align: center;
  cursor: pointer;
  
  .icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
  
  .name {
    font-size: 12px;
    font-weight: 500;
  }
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const Checkout = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    paymentMethod: 'card'
  })

  const loadCart = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id)
      
      if (error) throw error
      
      const items = data || []
      const total = items.reduce((sum, item) => {
        const price = item.product.promotion_price || item.product.price
        return sum + (price * item.quantity)
      }, 0)
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
      
      setCart({ items, total, itemCount })
      
      console.log('🛒 Panier chargé:', { itemsCount: items.length, total })
    } catch (error) {
      console.error('Error loading cart:', error)
      toast.error('Erreur lors du chargement du panier')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  const loadUserAddress = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('display_name, city, country')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          fullName: data.display_name || '',
          city: data.city || '',
          country: data.country || ''
        }))
        console.log('📍 Adresse utilisateur chargée:', data)
      }
    } catch (error) {
      console.error('Error loading address:', error)
    }
  }, [user.id])

  useEffect(() => {
    loadCart()
    loadUserAddress()
  }, [loadCart, loadUserAddress])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      // Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          total_amount: cart.total,
          shipping_address: `${formData.address}, ${formData.postalCode} ${formData.city}, ${formData.country}`,
          status: 'pending',
          payment_method: formData.paymentMethod,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (orderError) throw orderError
      
      console.log('📦 Commande créée:', { orderId: order.id, total: cart.total })
      
      // Créer les items de commande
      for (const item of cart.items) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            price_at_time: item.product.promotion_price || item.product.price
          })
        
        if (itemError) throw itemError
        
        // Mettre à jour le stock
        await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id)
        
        console.log(`📦 Produit ${item.product.id} commandé: ${item.quantity} unités`)
      }
      
      // Vider le panier
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
      
      toast.success('Commande créée avec succès !')
      navigate('/fan/shopping/orders')
      
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Erreur lors de la création de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <Header title="Paiement" showBack />
        <LoadingSpinner>
          <div>Chargement de votre panier...</div>
        </LoadingSpinner>
      </Container>
    )
  }

  if (cart.items.length === 0) {
    return (
      <Container>
        <Header title="Paiement" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
          <div>Votre panier est vide</div>
          <Button onClick={() => navigate('/fan/shopping')} style={{ marginTop: 20 }}>
            Continuer les achats
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Paiement" showBack />
      
      <form onSubmit={handleSubmit}>
        <Section>
          <SectionTitle>Votre commande</SectionTitle>
          <CartItemsList>
            {cart.items.map(item => (
              <CartItem key={item.id}>
                <ItemImage src={item.product.images?.[0] || '/images/default-product.jpg'} />
                <ItemDetails>
                  <ItemName>{item.product.name}</ItemName>
                  <ItemPrice>{item.product.promotion_price || item.product.price}€</ItemPrice>
                  <ItemQuantity>x{item.quantity}</ItemQuantity>
                </ItemDetails>
              </CartItem>
            ))}
          </CartItemsList>
          
          <Totals>
            <TotalRow>
              <span>Sous-total</span>
              <span>{cart.total}€</span>
            </TotalRow>
            <TotalRow>
              <span>Livraison</span>
              <span>Gratuite</span>
            </TotalRow>
            <TotalRow>
              <span>Total TTC</span>
              <span>{cart.total}€</span>
            </TotalRow>
          </Totals>
        </Section>
        
        <Section>
          <SectionTitle>Adresse de livraison</SectionTitle>
          
          <FormGroup>
            <Label>Nom complet</Label>
            <Input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Adresse</Label>
            <Input
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Ville</Label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Code postal</Label>
            <Input
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Pays</Label>
            <Select
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionner</option>
              <option value="France">France</option>
              <option value="Belgique">Belgique</option>
              <option value="Suisse">Suisse</option>
              <option value="Canada">Canada</option>
              <option value="Côte d'Ivoire">Côte d'Ivoire</option>
              <option value="Sénégal">Sénégal</option>
              <option value="Cameroun">Cameroun</option>
              <option value="RDC">République Démocratique du Congo</option>
            </Select>
          </FormGroup>
        </Section>
        
        <Section>
          <SectionTitle>Moyen de paiement</SectionTitle>
          <PaymentMethods>
            <PaymentMethod
              selected={formData.paymentMethod === 'card'}
              onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
              whileTap={{ scale: 0.98 }}
            >
              <div className="icon">💳</div>
              <div className="name">Carte bancaire</div>
            </PaymentMethod>
            <PaymentMethod
              selected={formData.paymentMethod === 'mobile_money'}
              onClick={() => setFormData({ ...formData, paymentMethod: 'mobile_money' })}
              whileTap={{ scale: 0.98 }}
            >
              <div className="icon">📱</div>
              <div className="name">Mobile Money</div>
            </PaymentMethod>
            <PaymentMethod
              selected={formData.paymentMethod === 'paypal'}
              onClick={() => setFormData({ ...formData, paymentMethod: 'paypal' })}
              whileTap={{ scale: 0.98 }}
            >
              <div className="icon">🅿️</div>
              <div className="name">PayPal</div>
            </PaymentMethod>
          </PaymentMethods>
        </Section>
        
        <div style={{ padding: '0 16px' }}>
          <Button
            type="submit"
            fullWidth
            loading={submitting}
            style={{ marginBottom: 20 }}
          >
            Payer {cart.total}€
          </Button>
        </div>
      </form>
    </Container>
  )
}

export default Checkout