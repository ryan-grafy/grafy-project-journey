import { render, screen } from '@testing-library/react'
import { expect, describe, it, vi } from 'vitest'
import App from '../App'

// 간단한 예제 테스트
describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('PROJECT JOURNEY')).toBeInTheDocument()
  })
})
