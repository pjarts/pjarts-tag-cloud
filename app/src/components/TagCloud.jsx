import xs from 'xstream'
import { style } from 'typestyle'
import Spinner from './Spinner'

const HEIGHT_UNITS = 500
const WIDTH_UNITS = 500

export default function TagCloud (sources) {
  const tagList$ = sources.tagList
  const vtree$ = tagList$
    .map(tagList => {
      // normalize token values into a range of font sizes
      const fontSizes = normalize(tagList.map(t => t[1]), 10, 200)
      // hashed key to force cycle.js to re-render the entire svg (no patching)
      const svgKey = btoa(JSON.stringify(tagList)).substr(0, 16)
      return (
        <svg className="tag-cloud"
            preserveAspectRatio="xMidYMid meet"
            key={svgKey} 
            width="600"
            height="600"
            viewBox={`0 0 ${WIDTH_UNITS} ${HEIGHT_UNITS}`}>
          <g hook={{ insert: onInsertGroup }}>
          {tagList.map(([tag, val], idx) => 
            <text style={`text-transform: uppercase; font-size:${fontSizes[idx]}px;`}>{tag}</text>
          )}
          </g>
        </svg>
      )
    })
    .startWith(<svg className="tag-cloud"></svg>)
  return {
    DOM: vtree$
  }
}

/**
 * Re-arrange <text> elements inside a <g> element
 * to form a nice tag cloud
 * @param {vnode} node 
 */
function onInsertGroup (node) {
  const { elm } = node
  const rects = []
  const transitions = []
  for (let child of elm.children) {
    const bbox = child.getBBox()
    // center over origo
    const next = {
      x: -bbox.width / 2,
      y: -bbox.height / 2,
      width: bbox.width,
      height: bbox.height
    }
    // delta angle to add to each iteration
    let dAngle = Math.PI / 100
    // delta radius to add
    let dRadius = 0.1
    // spiral out from origin until no collision
    // with any of the other rects is detected
    let i = 1
    while (rects.some(r => collides(
      // resize the rects vertically in order to compensate
      // for vertical padding on the <text> element
      resize(next, 0, next.height * -0.10),
      resize(r, 0, r.height * -0.10)        
    ))) {
      next.x = i * dRadius * Math.cos(i * dAngle) - next.width / 2
      next.y = i * dRadius * Math.sin(i * dAngle) - next.height / 2
      i++
    }
    rects.push(next)
    transitions.push({
      dX: next.x - bbox.x,
      dY: next.y - bbox.y
    })
  }
  // move all text elements to their designated position
  transitions.forEach((t, i) => {
    elm.children[i].setAttribute(
      'transform', 
      `matrix(1, 0, 0, 1, ${t.dX}, ${t.dY})`
    )
  })
  // scale the group element to fit within the canvas
  const bbox = elm.getBBox()
  const scale = Math.min(
    WIDTH_UNITS / bbox.width, 
    HEIGHT_UNITS / bbox.height
  )
  const translateX = -bbox.x * scale
  const translateY = -bbox.y * scale
  elm.setAttribute(
    'transform',
    `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
  )
}

/**
 * Expands or contracts a rect from its center point
 * @param {object} rect 
 * @param {number} mX 
 * @param {number} mY 
 */
function resize (rect, mX, mY) {
  return {
    x: rect.x - mX,
    y: rect.y - mY,
    width: rect.width + 2 * mX,
    height: rect.height + 2 * mY
  }
}

/**
 * Check whether two rects intersect
 * @param {object} r1 
 * @param {object} r2 
 */
function collides (r1, r2) {
  const intersectX = r1.x + r1.width > r2.x && r1.x < r2.x + r2.width
  const intersectY = r1.y + r1.height > r2.y && r1.y < r2.y + r2.height
  return intersectX && intersectY
}

/**
 * Normalize an array of numbers
 * @param {array} values 
 * @param {number} min 
 * @param {number} max 
 */
function normalize (values, min, max) {
  const highest = Math.max(...values)
  const scale = (max - min) / highest
  return values.map(v => Math.floor(min + scale * v))
}
