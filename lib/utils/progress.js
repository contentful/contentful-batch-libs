import Rx from 'rxjs/Rx'
import co from 'co'

export function createPagedObservable (fetch, pageLimit) {
  function * traverseGen (next) {
    let skip = 0
    let total = 1

    while (skip < total) {
      const result = yield fetch(skip, pageLimit)
      next(result)
      total = result.total
      skip = skip + pageLimit
    }
  }

  const traverser = co.wrap(traverseGen)

  return new Rx.Observable((subscriber) => {
    traverser((val) => subscriber.next(val))
    .then(() => subscriber.complete())
  })
}

export function createProgressObservable (traverser$) {
  const startTime = Date.now()
  return Rx.Observable.from(traverser$)
  .throttleTime(100)
  .map((state) => {
    const { current, max } = state
    const ratio = current / max
    const percent = ratio * 100
    const currentTime = Date.now()
    const diffTime = currentTime - startTime
    const totalTime = diffTime / ratio
    const eta = (totalTime - diffTime) / 1000
    return `[${current}/${max}] - ${Math.ceil(percent)}% - ETA: ${eta.toFixed(2)}s`
  })
}

export function createPagedProgressObservable (traverser$, pageLimit) {
  const enhancedTraverser$ = traverser$
    .map((result) => {
      const { skip, total } = result
      const current = Math.ceil(skip / pageLimit) + 1
      const max = Math.ceil(total / pageLimit)
      return {
        current,
        max
      }
    })

  return createProgressObservable(enhancedTraverser$)
}
