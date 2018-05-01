import xs from 'xstream'

export default function TagForm (sources) {
  const value$ = sources.DOM.select('form').events('submit')
    .map(ev => { ev.preventDefault(); return ev })
    .map(ev => ({
      hashtag: ev.target.elements.hashtag.value,
      rssLink: ev.target.elements.rssLink.value
    }))
  const vtree$ = xs.of(
    <form className="tag-form">
      <div className="form-group hashtag">
        <label>
          <span>Hashtag</span>
          <input type="text" placeholder="#hashtag" name="hashtag"/>
        </label>
      </div>
      <div className="form-group rss-link">
        <label>
          <span>RSS Link</span>
          <input type="text" placeholder="http://link.to/rss-feed.xml" name="rssLink"/>
        </label>
      </div>
      <div className="form-group submit">
        <button type="submit">Generate</button>
      </div>
    </form>
  )
  return {
    DOM: vtree$,
    value: value$
  }
}