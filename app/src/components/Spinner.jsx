import xs from 'xstream'
import { style, keyframes } from 'typestyle'

const skRotateplane = keyframes({
  '0%': { 
    transform: 'perspective(120px) rotateX(0deg) rotateY(0deg)'
  },
  '50%': { 
    transform: 'perspective(120px) rotateX(-180.1deg) rotateY(0deg)'
  },
  '100%': { 
    transform: 'perspective(120px) rotateX(-180deg) rotateY(-179.9deg)'
  }
})

const spinnerClass = style({
  width: '40px',
  height: '40px',
  backgroundColor: '#333',
  animationName: skRotateplane,
  animationDuration: '1.2s',
  animationIterationCount: 'infinite',
  ease: 'ease-in-out'
})

export default function Spinner (sources) {
  const vdom$ = xs.of(
    <div className={spinnerClass}></div>
  )
  return {
    DOM: vdom$
  }
}
