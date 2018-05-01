import xs from 'xstream'
import TagCloud from './components/TagCloud'
import Spinner from './components/Spinner'
import TagForm from './components/TagForm'
import isolate from '@cycle/isolate'

export function App ({ DOM, HTTP, props$ }) {
  const spinnerDom$ = Spinner().DOM
  const Form = isolate(TagForm)
  const form = Form({ DOM })
  const spinner = Spinner()
  const formDom$ = form.DOM
  const request$ = form.value.map(({ hashtag, rssLink}) => ({
      url: 'http://localhost:3000/tags',
      method: 'POST',
      category: 'tags',
      send: {
        hashtag,
        rssLink
      },
      type: 'application/json',
      accept: 'application/json'
    }))
  const responses$ = HTTP
    .select('tags')
    .map(response$ => response$.replaceError(err => {
      if (err.response) {
        return xs.of(new Error(err.response.text))
      } else {
        return xs.of(new Error(err.message))
      }
    }))
    .flatten()
  const tagList$ = responses$
    .filter(res => !(res instanceof Error))
    .map(res => res.body)
  const errorDom$ = xs.merge(
    responses$
      .filter(res => res instanceof Error)
      .map(err =>
        <div className="error">
          <p>{err.message}</p>
        </div>
      ),
    form.value.mapTo(<div className="error"></div>)
  ).startWith(<div></div>)
  const tagSources = {
    tagList: tagList$
  }
  const tagCloud = TagCloud(tagSources)
  const tagCloudDom$ = tagCloud.DOM
  const waitingForResponse$ = xs.merge(
    responses$.mapTo(false),
    form.value.mapTo(true)
  )
    .startWith(false)

  const vtree$ = xs.combine(
    tagCloudDom$,
    formDom$,
    errorDom$,
    waitingForResponse$,
    spinner.DOM
  )
    .map(([tagCloud, form, errors, waiting, spinner]) => 
      <div className="app">
        <header>
          <h1>Tag Cloud by Per Jonsson</h1>
        </header>
        <div className="spinner-wrapper" style={display('flex', waiting)}>
          {spinner}
        </div>
        <div className="form-wrapper" style={display('block', !waiting)}>
          {form}
          <div className="errors">
            {errors}
          </div> 
        </div>
        {tagCloud}
        <footer>
          <div>
            <a href="mailto:per@pjarts.se">per@pjarts.se</a>
          </div>
          <div>
            <a href="tel:0705 47 20 88">0705 47 20 88</a>
          </div>
          <div>
            <a href="https://github.com/pjarts">github.com/pjarts</a>
          </div>
        </footer>
      </div>
    )
  const sinks = {
    DOM: vtree$,
    HTTP: request$
  }
  return sinks
}

function display (val, cond) {
  return `display: ${cond ? val : 'none'}`
}