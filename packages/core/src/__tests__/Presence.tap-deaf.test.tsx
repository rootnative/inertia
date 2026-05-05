import { render, screen } from '@testing-library/react-native'
import { Motion, Presence } from '../index'

// Acceptance test for the moti #297 repro:
// while a Presence child is exiting, taps must fall through to whatever's
// underneath. The factory enforces this by merging `pointerEvents: 'none'`
// onto the rendered style array as soon as `isPresent` flips false.

function Harness({ visible }: { visible: boolean }) {
  return (
    <Presence>
      {visible ? (
        <Motion.View
          key="card"
          testID="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      ) : null}
    </Presence>
  )
}

describe('Presence — moti #297 tap-deaf exit', () => {
  it('does not set pointerEvents: none while present', () => {
    render(<Harness visible={true} />)
    const card = screen.getByTestId('card')
    const style = (card.props as { style: unknown }).style
    expect(Array.isArray(style)).toBe(true)
    expect(style as unknown[]).not.toEqual(
      expect.arrayContaining([{ pointerEvents: 'none' }]),
    )
  })

  it('merges pointerEvents: none onto the exiting child', () => {
    const { rerender } = render(<Harness visible={true} />)
    rerender(<Harness visible={false} />)
    const card = screen.getByTestId('card')
    const style = (card.props as { style: unknown }).style
    expect(style as unknown[]).toEqual(
      expect.arrayContaining([{ pointerEvents: 'none' }]),
    )
  })
})
