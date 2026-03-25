// src/modules/admin/pages/UserManagement.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { 
  Search, Filter, ChevronLeft, ChevronRight, 
  MoreVertical, UserCheck, UserX, Shield, 
  Mail, Phone, Calendar, MapPin, Music, ShoppingBag
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

const SearchBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const SearchInput = styled.div`
  position: relative;
  
  input {
    width: 300px;
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
    width: 18px;
    height: 18px;
  }
`

const FilterButton = styled(motion.button)`
  padding: 10px 16px;
  border-radius: 24px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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
    cursor: pointer;
    
    &:hover {
      color: ${props => props.theme.primary};
    }
  }
  
  td {
    color: ${props => props.theme.text};
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
      case 'active': return '#00C85120';
      case 'pending': return '#FFB44420';
      case 'blocked': return '#FF444420';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'active': return '#00C851';
      case 'pending': return '#FFB444';
      case 'blocked': return '#FF4444';
      default: return '#888888';
    }
  }};
`

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  object-fit: cover;
`

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
`

const PageButton = styled(motion.button)`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const RoleFilter = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const RoleChip = styled(motion.button)`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.active ? props.theme.primary : props.theme.border};
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 13px;
  cursor: pointer;
`

const ActionMenu = styled.div`
  position: relative;
`

const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow.lg};
  border: 1px solid ${props => props.theme.border};
  z-index: 10;
  min-width: 150px;
`

const ActionItem = styled.button`
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.text};
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${props => props.theme.border};
  }
  
  &.danger {
    color: #FF4444;
  }
`

const UserManagement = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [openMenu, setOpenMenu] = useState(null)
  
  const itemsPerPage = 20

  useEffect(() => {
    loadUsers()
  }, [searchQuery, roleFilter, statusFilter, sortBy, sortOrder, currentPage])

  const loadUsers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
      
      // Filtre de recherche
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      }
      
      // Filtre de rôle
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }
      
      // Filtre de statut
      if (statusFilter === 'active') {
        query = query.eq('is_blocked', false)
      } else if (statusFilter === 'blocked') {
        query = query.eq('is_blocked', true)
      }
      
      // Tri
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      setUsers(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleBlockUser = async (userId, currentStatus) => {
    try {
      await supabase
        .from('users')
        .update({ 
          is_blocked: !currentStatus,
          blocked_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', userId)
      
      toast.success(`Utilisateur ${!currentStatus ? 'bloqué' : 'débloqué'} avec succès`)
      loadUsers()
    } catch (error) {
      console.error('Error blocking user:', error)
      toast.error('Erreur lors de l\'opération')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.')) {
      try {
        await supabase
          .from('users')
          .delete()
          .eq('id', userId)
        
        toast.success('Utilisateur supprimé avec succès')
        loadUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleMakeAdmin = async (userId) => {
    try {
      await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId)
      
      toast.success('Utilisateur promu administrateur')
      loadUsers()
    } catch (error) {
      console.error('Error making admin:', error)
      toast.error('Erreur lors de la promotion')
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'fan': return '🎧'
      case 'artist': return '🎤'
      case 'seller': return '🛍️'
      case 'admin': return '👑'
      default: return '👤'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'fan': return 'Fan'
      case 'artist': return 'Artiste'
      case 'seller': return 'Vendeur'
      case 'admin': return 'Admin'
      default: return role
    }
  }

  return (
    <Container>
      <Header>
        <Title>Gestion des utilisateurs</Title>
        <SearchBar>
          <SearchInput>
            <Search size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchInput>
          <FilterButton whileTap={{ scale: 0.95 }}>
            <Filter size={18} />
            Filtres
          </FilterButton>
        </SearchBar>
      </Header>
      
      <RoleFilter>
        <RoleChip
          active={roleFilter === 'all'}
          onClick={() => setRoleFilter('all')}
          whileTap={{ scale: 0.95 }}
        >
          Tous
        </RoleChip>
        <RoleChip
          active={roleFilter === 'fan'}
          onClick={() => setRoleFilter('fan')}
          whileTap={{ scale: 0.95 }}
        >
          🎧 Fans
        </RoleChip>
        <RoleChip
          active={roleFilter === 'artist'}
          onClick={() => setRoleFilter('artist')}
          whileTap={{ scale: 0.95 }}
        >
          🎤 Artistes
        </RoleChip>
        <RoleChip
          active={roleFilter === 'seller'}
          onClick={() => setRoleFilter('seller')}
          whileTap={{ scale: 0.95 }}
        >
          🛍️ Vendeurs
        </RoleChip>
        <RoleChip
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          whileTap={{ scale: 0.95 }}
        >
          ✅ Actifs
        </RoleChip>
        <RoleChip
          active={statusFilter === 'blocked'}
          onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')}
          whileTap={{ scale: 0.95 }}
        >
          🔒 Bloqués
        </RoleChip>
      </RoleFilter>
      
      <Table>
        <thead>
          <tr>
            <th onClick={() => handleSort('username')}>Utilisateur</th>
            <th onClick={() => handleSort('email')}>Email</th>
            <th onClick={() => handleSort('role')}>Rôle</th>
            <th onClick={() => handleSort('created_at')}>Date</th>
            <th onClick={() => handleSort('is_blocked')}>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>Chargement...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>Aucun utilisateur trouvé</td></tr>
          ) : (
            users.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar src={user.avatar_url || '/images/default-avatar.png'} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.display_name || user.username}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={14} /> {user.email}
                  </div>
                  {user.phone && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      <Phone size={12} /> {user.phone}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: 20, marginRight: 4 }}>{getRoleIcon(user.role)}</span>
                  {getRoleLabel(user.role)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} /> {formatDate(user.created_at)}
                  </div>
                </td>
                <td>
                  <StatusBadge status={user.is_blocked ? 'blocked' : 'active'}>
                    {user.is_blocked ? 'Bloqué' : 'Actif'}
                  </StatusBadge>
                </td>
                <td>
                  <ActionMenu>
                    <ActionButton onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} whileTap={{ scale: 0.9 }}>
                      <MoreVertical size={18} />
                    </ActionButton>
                    {openMenu === user.id && (
                      <ActionDropdown
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <ActionItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                          <UserCheck size={16} /> Voir détails
                        </ActionItem>
                        <ActionItem onClick={() => handleBlockUser(user.id, user.is_blocked)}>
                          <Shield size={16} /> {user.is_blocked ? 'Débloquer' : 'Bloquer'}
                        </ActionItem>
                        {user.role !== 'admin' && (
                          <ActionItem onClick={() => handleMakeAdmin(user.id)}>
                            <Shield size={16} /> Promouvoir admin
                          </ActionItem>
                        )}
                        <ActionItem className="danger" onClick={() => handleDeleteUser(user.id)}>
                          <UserX size={16} /> Supprimer
                        </ActionItem>
                      </ActionDropdown>
                    )}
                  </ActionMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      
      {totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={16} />
          </PageButton>
          <span>Page {currentPage} / {totalPages}</span>
          <PageButton
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={16} />
          </PageButton>
        </Pagination>
      )}
    </Container>
  )
}

export default UserManagement