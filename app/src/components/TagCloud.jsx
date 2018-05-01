import xs from 'xstream'
import { style } from 'typestyle'
import Spinner from './Spinner'

const HEIGHT = 500
const WIDTH = 500
const TEXT_MARGIN = [ 0.01, -0.1 ]
const FONT_SIZE_RANGE = [0, 1500]

export default function TagCloud (sources) {
  const tagList$ = sources.tagList
  const vtree$ = tagList$
    .map(tagList => {
      const fontSizes = normalize(tagList.map(t => t[1]), 10, 300)
      const svgKey = btoa(JSON.stringify(tagList)).substr(0, 16)
      return (
        <svg className="tag-cloud" key={svgKey} viewBox="0 0 500 500">
          <g hook={{ insert: onInsertGroup }}>
          {tagList.map(([tag, val], idx) => 
            <text x="0" y="0" style={`text-transform: uppercase; font-size:${fontSizes[idx]}px;`}>{tag}</text>
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

function onInsertGroup (node) {
  const { elm } = node
  const children = Array.from(elm.children)
  const bboxes = children.reduce((acc, child) => {
    const bbox = child.getBoundingClientRect()

    const next = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height
    }
    // apply margins
    // next.height += 2 * TEXT_MARGIN[1] * next.height
    // next.width += 2 * TEXT_MARGIN[0] * next.width
    // move origin to center of bbox
    next.x -= (next.width / 2)
    next.y -= (next.height / 2)
    let dAngle = Math.PI / 100
    let dRadius = 0.007
    let i = 1
    while (collides(next, acc)) {
      next.x = next.x + i * dRadius * Math.cos(i * dAngle)
      next.y = next.y + i * dRadius * Math.sin(i * dAngle)
      i++
    }
    next.dX = next.x - bbox.x
    next.dY = next.y - bbox.y
    acc.push(next)
    return acc
  }, [])
  bboxes.forEach((b, i) => {
    elm.children[i].setAttribute('transform', `matrix(1, 0, 0, 1, ${b.dX}, ${b.dY})`)
  })
  const bbox = elm.getBBox()
  const scale = Math.min(500 / bbox.width, 500 / bbox.height)
  const translateX = -bbox.x * scale
  const translateY = -bbox.y * scale
  debugger
  elm.setAttribute('transform', `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`)
}

function collides (bbox, boxes) {
  return boxes.some(b => {
    const intersectX = bbox.x + bbox.width > b.x && bbox.x < b.x + b.width
    const intersectY = bbox.y + bbox.height > b.y && bbox.y < b.y + b.height
    return intersectX && intersectY
  })
}

function normalize (values, min, max) {
  const highest = Math.max(...values)
  const scale = (max - min) / highest
  return values.map(v => min + scale * v)
}