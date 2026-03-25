// src/modules/shared/components/ui/Input.jsx
import React, { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const InputContainer = styled.div`
  position: relative;
  width: 100%;
`

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.error ? '#FF4444' : props.theme.border};
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:focus-within {
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.primary}20;
  }
`

const Icon = styled.span`
  padding: 0 12px;
  font-size: 18px;
  color: ${props => props.theme.textSecondary};
`

const StyledInput = styled.input`
  flex: 1;
  padding: 12px 12px 12px 0;
  border: none;
  background: transparent;
  font-size: 16px;
  color: ${props => props.theme.text};
  outline: none;
  
  &::placeholder {
    color: ${props => props.theme.textSecondary};
  }
  
  &:disabled {
    opacity: 0.5;
  }
`

const ErrorMessage = styled(motion.p)`
  color: #FF4444;
  font-size: 12px;
  margin-top: 4px;
  margin-left: 12px;
`

export const Input = ({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  icon,
  disabled = false,
  required = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <InputContainer>
      <InputWrapper error={error}>
        {icon && <Icon>{icon}</Icon>}
        <StyledInput
          type={inputType}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          {...props}
        />
        {type === 'password' && (
          <Icon onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </Icon>
        )}
      </InputWrapper>
      {error && (
        <ErrorMessage
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </ErrorMessage>
      )}
    </InputContainer>
  )
}