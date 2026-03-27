// src/modules/admin/pages/PaymentManagement.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, TrendingDown, Search,
  Filter, Calendar, Download, Eye, CheckCircle,
  XCircle, Clock, RefreshCw, AlertCircle
} from 'lucide-react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`

const StatCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  text-align: center;
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${props => props.theme.border};
  padding-bottom: 12px;
`

const Tab = styled(motion.button)`
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  background: ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
`

const SearchBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`

const SearchInput = styled.div`
  flex: 1;
  position: relative;
  
  input {
    width: 100%;
    padding: 10px 16px 10px 40px;
    border-radius: 24px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
  
  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.textSecondary};
  }
`

const Table = styled.table`
  width: 100%;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  
  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.border};
  }
  
  th {
    font-weight: 600;
    color: ${props => props.theme.textSecondary};
    background: ${props => props.theme.background};
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
      case 'completed': return '#00C85120';
      case 'pending': return '#FFB44420';
      case 'failed': return '#FF444420';
      case 'refunded': return '#33B5E520';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'completed': return '#00C851';
      case 'pending': return '#FFB444';
      case 'failed': return '#FF4444';
      case 'refunded': return '#33B5E5';
      default: return '#888888';
    }
  }};
`

const ActionButton = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  margin: 0 4px;
  padding: 4px;
  border-radius: 8px;
  color: ${props => props.theme.textSecondary};
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const RefundModal = styled(motion.div)`
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
`

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 24px;
  width: 400px;
  max-width: 90%;
  padding: 24px;
`

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const ModalInput = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  margin-bottom: 20px;
`

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const PaymentManagement = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [transactions, setTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    pendingPayouts: 0,
    refundedAmount: 0,
    successRate: 0
  })
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select('*, user:users(id, username, display_name, avatar_url)')
        .order('created_at', { ascending: false })
      
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }
      
      if (searchQuery) {
        query = query.or(`user.username.ilike.%${searchQuery}%,transaction_id.ilike.%${searchQuery}%`)
      }
      
      const { data, error } = await query.limit(100)
      
      if (error) throw error
      setTransactions(data || [])
      
      // Calculer les stats
      const completed = data?.filter(t => t.status === 'completed') || []
      const pending = data?.filter(t => t.status === 'pending') || []
      const refunded = data?.filter(t => t.status === 'refunded') || []
      
      setStats({
        totalRevenue: completed.reduce((sum, t) => sum + t.amount, 0),
        totalTransactions: data?.length || 0,
        pendingPayouts: pending.reduce((sum, t) => sum + t.amount, 0),
        refundedAmount: refunded.reduce((sum, t) => sum + t.amount, 0),
        successRate: data?.length ? (completed.length / data.length * 100) : 0
      })
      
      console.log('💰 Transactions chargées:', {
        count: data?.length,
        totalRevenue: completed.reduce((sum, t) => sum + t.amount, 0),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleRefund = async () => {
    if (!selectedTransaction) return
    
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0 || amount > selectedTransaction.amount) {
      toast.error('Montant invalide')
      return
    }
    
    try {
      // Appeler l'API de remboursement Stripe
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: selectedTransaction.id,
          amount: amount,
          reason: 'customer_request'
        })
      })
      
      if (!response.ok) throw new Error('Refund failed')
      
      const result = await response.json()
      
      toast.success(`Remboursement de ${amount}€ effectué avec succès`)
      console.log('💸 Remboursement effectué:', {
        transactionId: selectedTransaction.id,
        amount: amount,
        refundId: result.refund_id
      })
      
      setShowRefundModal(false)
      setRefundAmount('')
      loadTransactions()
    } catch (error) {
      console.error('Error refunding:', error)
      toast.error('Erreur lors du remboursement')
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#00C851" />
      case 'pending': return <Clock size={16} color="#FFB444" />
      case 'failed': return <XCircle size={16} color="#FF4444" />
      case 'refunded': return <RefreshCw size={16} color="#33B5E5" />
      default: return <AlertCircle size={16} />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Complété'
      case 'pending': return 'En attente'
      case 'failed': return 'Échoué'
      case 'refunded': return 'Remboursé'
      default: return status
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <Container>
        <Header>
          <Title>Gestion des paiements</Title>
        </Header>
        <LoadingSpinner>
          <div>Chargement des transactions...</div>
        </LoadingSpinner>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Gestion des paiements</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <ActionButton whileTap={{ scale: 0.95 }} onClick={() => loadTransactions()}>
            <RefreshCw size={18} />
          </ActionButton>
        </div>
      </Header>
      
      <StatsGrid>
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalRevenue.toLocaleString()}€</StatValue>
          <StatLabel>Revenus totaux</StatLabel>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalTransactions}</StatValue>
          <StatLabel>Transactions</StatLabel>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.pendingPayouts.toLocaleString()}€</StatValue>
          <StatLabel>Paiements en attente</StatLabel>
        </StatCard>
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.successRate.toFixed(1)}%</StatValue>
          <StatLabel>Taux de succès</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <Tabs>
        <Tab
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          whileTap={{ scale: 0.95 }}
        >
          Tous ({stats.totalTransactions})
        </Tab>
        <Tab
          active={activeTab === 'completed'}
          onClick={() => setActiveTab('completed')}
          whileTap={{ scale: 0.95 }}
        >
          Complétés
        </Tab>
        <Tab
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          whileTap={{ scale: 0.95 }}
        >
          En attente
        </Tab>
        <Tab
          active={activeTab === 'failed'}
          onClick={() => setActiveTab('failed')}
          whileTap={{ scale: 0.95 }}
        >
          Échoués
        </Tab>
        <Tab
          active={activeTab === 'refunded'}
          onClick={() => setActiveTab('refunded')}
          whileTap={{ scale: 0.95 }}
        >
          Remboursés
        </Tab>
      </Tabs>
      
      <SearchBar>
        <SearchInput>
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par utilisateur ou ID de transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInput>
        <ActionButton whileTap={{ scale: 0.95 }} title="Filtrer">
          <Filter size={18} />
        </ActionButton>
        <ActionButton whileTap={{ scale: 0.95 }} title="Exporter">
          <Download size={18} />
        </ActionButton>
      </SearchBar>
      
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Utilisateur</th>
              <th>Montant</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>💸</div>
                  Aucune transaction trouvée
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.id.slice(-8)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img 
                        src={tx.user?.avatar_url || '/images/default-avatar.png'} 
                        style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover' }} 
                        alt={tx.user?.username}
                      />
                      <span>@{tx.user?.username}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{tx.amount.toLocaleString()}€</td>
                  <td>
                    <span style={{ 
                      textTransform: 'capitalize',
                      background: '#FF6B3520',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {tx.type || 'paiement'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={tx.status}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {getStatusIcon(tx.status)} {getStatusText(tx.status)}
                      </span>
                    </StatusBadge>
                  </td>
                  <td style={{ fontSize: 13 }}>{formatDate(tx.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionButton 
                        onClick={() => window.open(`/admin/transactions/${tx.id}`, '_blank')} 
                        whileTap={{ scale: 0.9 }}
                        title="Voir les détails"
                      >
                        <Eye size={16} />
                      </ActionButton>
                      {tx.status === 'completed' && (
                        <ActionButton 
                          onClick={() => {
                            setSelectedTransaction(tx)
                            setRefundAmount(tx.amount.toString())
                            setShowRefundModal(true)
                          }} 
                          whileTap={{ scale: 0.9 }}
                          title="Rembourser"
                        >
                          <RefreshCw size={16} />
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      
      {showRefundModal && selectedTransaction && (
        <RefundModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowRefundModal(false)}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Remboursement</ModalTitle>
            <p style={{ marginBottom: 16, color: '#888' }}>
              Transaction: <strong>{selectedTransaction.id.slice(-8)}</strong><br />
              Utilisateur: <strong>@{selectedTransaction.user?.username}</strong><br />
              Montant original: <strong>{selectedTransaction.amount}€</strong>
            </p>
            <ModalInput
              type="number"
              step="0.01"
              placeholder="Montant à rembourser"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <ModalButtons>
              <button
                onClick={() => setShowRefundModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleRefund}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#FF6B35',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Confirmer le remboursement
              </button>
            </ModalButtons>
          </ModalContent>
        </RefundModal>
      )}
    </Container>
  )
}

export default PaymentManagement