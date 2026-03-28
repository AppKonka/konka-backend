// src/modules/seller/pages/ProductManagement.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
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
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const AddButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const SearchBar = styled.div`
  padding: 0 16px 16px;
  
  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 28px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
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

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
`

const ProductCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const ProductImage = styled.div`
  height: 150px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .stock-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: ${props => props.stock < 10 ? '#FF4444' : '#00C851'};
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
  }
`

const ProductInfo = styled.div`
  padding: 12px;
`

const ProductName = styled.h3`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ProductPrice = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 8px;
`

const ProductStock = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const ProductActions = styled.div`
  display: flex;
  gap: 8px;
`

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 6px;
  border-radius: 20px;
  border: none;
  background: ${props => props.primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.primary ? 'white' : props.theme.text};
  font-size: 12px;
  cursor: pointer;
`

const Modal = styled(motion.div)`
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
  max-height: 90vh;
  overflow-y: auto;
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

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const FileInput = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
`

const ImagePreview = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  
  img {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
  }
`

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
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

const categories = [
  { id: 'clothing', label: 'Vêtements' },
  { id: 'music', label: 'Musique / Disques' },
  { id: 'instruments', label: 'Instruments' },
  { id: 'merch', label: 'Produits dérivés' },
  { id: 'art', label: 'Artisanat' },
  { id: 'electronics', label: 'Électronique' },
]

const ProductManagement = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [],
    is_active: true,
  })
  const [imagePreviews, setImagePreviews] = useState([])
  
  const { user } = useAuth()

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
      
      if (activeTab === 'active') {
        query = query.eq('is_active', true)
      } else if (activeTab === 'inactive') {
        query = query.eq('is_active', false)
      } else if (activeTab === 'lowStock') {
        query = query.lt('stock', 10).gt('stock', 0)
      }
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setProducts(data || [])
      
      console.log('📦 Produits chargés:', {
        count: data?.length,
        activeTab,
        searchQuery: searchQuery || 'aucun'
      })
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }, [user.id, activeTab, searchQuery])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    const previews = files.map(file => URL.createObjectURL(file))
    setImagePreviews(previews)
    setFormData({ ...formData, images: files })
    
    console.log('🖼️ Images sélectionnées:', files.map(f => f.name))
  }

  const uploadImages = async (files) => {
    const urls = []
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `products/${user.id}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file)
      
      if (error) throw error
      
      // Utiliser data pour les logs
      console.log('✅ Image uploadée:', {
        fileName: data.path,
        fileId: data.id,
        filePath
      })
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)
      
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    setUploading(true)
    try {
      let imageUrls = formData.images
      if (formData.images.length > 0 && typeof formData.images[0] !== 'string') {
        imageUrls = await uploadImages(formData.images)
      }
      
      if (editingProduct) {
        // Mettre à jour le produit
        const { data, error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            stock: parseInt(formData.stock) || 0,
            images: imageUrls.length > 0 ? imageUrls : formData.images,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)
          .select()
        
        if (error) throw error
        
        if (data && data[0]) {
          console.log('✏️ Produit modifié:', {
            productId: data[0].id,
            name: data[0].name,
            price: data[0].price
          })
          toast.success('Produit modifié avec succès')
        }
      } else {
        // Créer un nouveau produit
        const { data, error } = await supabase
          .from('products')
          .insert({
            seller_id: user.id,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            stock: parseInt(formData.stock) || 0,
            images: imageUrls,
            is_active: formData.is_active,
            created_at: new Date().toISOString()
          })
          .select()
        
        if (error) throw error
        
        if (data && data[0]) {
          console.log('✨ Nouveau produit créé:', {
            productId: data[0].id,
            name: data[0].name,
            price: data[0].price
          })
          toast.success('Produit ajouté avec succès')
        }
      }
      
      setShowModal(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        images: [],
        is_active: true,
      })
      setImagePreviews([])
      loadProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error('Erreur lors de l\'enregistrement du produit')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      stock: product.stock?.toString() || '',
      images: product.images || [],
      is_active: product.is_active,
    })
    setImagePreviews(product.images || [])
    setShowModal(true)
    console.log('✏️ Édition du produit:', product.id)
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('🗑️ Produit supprimé:', {
          productId: data[0].id,
          name: data[0].name
        })
        toast.success('Produit supprimé avec succès')
      }
      
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Erreur lors de la suppression du produit')
    }
  }

  const handleToggleActive = async (product) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          is_active: !product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('🔄 Statut produit modifié:', {
          productId: data[0].id,
          is_active: data[0].is_active
        })
        toast.success(`Produit ${data[0].is_active ? 'activé' : 'désactivé'}`)
      }
      
      loadProducts()
    } catch (error) {
      console.error('Error toggling product:', error)
      toast.error('Erreur lors de la modification du statut')
    }
  }

  // Calculer les statistiques
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Mes Produits" showProfile showBack />
        <LoadingSpinner>
          <div>Chargement de vos produits...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Mes Produits" showProfile showBack />
      
      <HeaderSection>
        <Title>Mes Produits</Title>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            📊 {stats.total} produits • {stats.totalValue.toLocaleString()}€
          </div>
          <AddButton onClick={() => {
            setEditingProduct(null)
            setFormData({
              name: '',
              description: '',
              price: '',
              category: '',
              stock: '',
              images: [],
              is_active: true,
            })
            setImagePreviews([])
            setShowModal(true)
          }} whileTap={{ scale: 0.95 }}>
            +
          </AddButton>
        </div>
      </HeaderSection>
      
      <SearchBar>
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchBar>
      
      <TabsContainer>
        <Tab
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        >
          Tous ({stats.total})
        </Tab>
        <Tab
          active={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
        >
          Actifs ({stats.active})
        </Tab>
        <Tab
          active={activeTab === 'inactive'}
          onClick={() => setActiveTab('inactive')}
        >
          Inactifs ({stats.inactive})
        </Tab>
        <Tab
          active={activeTab === 'lowStock'}
          onClick={() => setActiveTab('lowStock')}
        >
          Stock faible ({stats.lowStock})
        </Tab>
      </TabsContainer>
      
      <ProductsGrid>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', gridColumn: 'span 2' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <div>Aucun produit</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Cliquez sur "+" pour ajouter votre premier produit
            </div>
          </div>
        ) : (
          products.map(product => (
            <ProductCard key={product.id}>
              <ProductImage stock={product.stock}>
                <img src={product.images?.[0] || '/images/default-product.jpg'} alt={product.name} />
                <div className="stock-badge">
                  Stock: {product.stock || 0}
                </div>
              </ProductImage>
              <ProductInfo>
                <ProductName>{product.name}</ProductName>
                <ProductPrice>{product.price}€</ProductPrice>
                <ProductStock>
                  {product.is_active ? '✅ Actif' : '⭕ Inactif'}
                  {product.sold_count > 0 && ` • Vendus: ${product.sold_count}`}
                </ProductStock>
                <ProductActions>
                  <ActionButton
                    onClick={() => handleEdit(product)}
                    whileTap={{ scale: 0.95 }}
                  >
                    ✏️ Modifier
                  </ActionButton>
                  <ActionButton
                    primary={!product.is_active}
                    onClick={() => handleToggleActive(product)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {product.is_active ? '⭕ Désactiver' : '✅ Activer'}
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleDelete(product.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    🗑️
                  </ActionButton>
                </ProductActions>
              </ProductInfo>
            </ProductCard>
          ))
        )}
      </ProductsGrid>
      
      <MusicPlayer />
      <BottomNavigation />
      
      {showModal && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </ModalTitle>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <Label>Nom du produit *</Label>
                <Input
                  placeholder="Nom..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  placeholder="Description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Prix (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Prix..."
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Catégorie</Label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Stock</Label>
                <Input
                  type="number"
                  placeholder="Quantité..."
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Images</Label>
                <FileInput
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                {imagePreviews.length > 0 && (
                  <ImagePreview>
                    {imagePreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx}`} />
                    ))}
                  </ImagePreview>
                )}
              </FormGroup>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={uploading || !formData.name || !formData.price}
              >
                {uploading ? 'Enregistrement...' : (editingProduct ? 'Modifier' : 'Ajouter')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default ProductManagement