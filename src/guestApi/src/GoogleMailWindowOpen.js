(function () {
  /**
  * Patches the window open command for a given window
  * @param window: the window to patch
  */
  const patchWindowOpen = function (window) {
    const defaultOpenFn = window.open
    window.open = function () {
      if (arguments[0] === '' && arguments[1] === '_blank') {
        // Preview draft links, open Github Issues
        const windowRef = defaultOpenFn.apply(window, Array.from(arguments))
        return new Proxy(windowRef, {
          get: (target, key) => {
            if (key === 'document') {
              return new Proxy(target.document, {
                get: (target, key) => {
                  if (key === 'write') {
                    return function (value) {
                      if (value.startsWith('<META HTTP-EQUIV="refresh" content="0')) {
                        const parser = new window.DOMParser()
                        const xml = parser.parseFromString(value, 'text/xml')
                        const content = xml.firstChild.getAttribute('content')
                        const url = content.replace('0; url=', '')
                        defaultOpenFn(url)
                        windowRef.close()
                      } else {
                        target.write.apply(target, Array.from(arguments))
                      }
                    }
                  } else {
                    return target[key]
                  }
                }
              })
            } else {
              return target[key]
            }
          }
        })
      } else {
        return defaultOpenFn.apply(window, Array.from(arguments))
      }
    }
  }

  /**
  * Patches the window open command in a given iframe
  * @param iframe: the iframe to patch
  */
  const patchIframeWindowOpen = function (iframe) {
    if (iframe.getAttribute('data-wavebox-patched')) { return }

    try {
      patchWindowOpen(iframe.contentWindow)
    } catch (ex) {
      /* no-op */
    }
    iframe.setAttribute('data-wavebox-patched', 'true')
  }

  /**
  * Patches all iframes with the window open code
  */
  const patchAllIframeWindowOpen = function () {
    Array.from(document.body.querySelectorAll('iframe:not([data-wavebox-patched])')).forEach((element) => {
      patchIframeWindowOpen(element)
    })
  }

  // Start
  patchWindowOpen(window)
  document.addEventListener('DOMContentLoaded', () => {
    patchAllIframeWindowOpen()
  }, false)
  document.addEventListener('DOMNodeInserted', (evt) => {
    if (evt.target.tagName === 'IFRAME') {
      patchIframeWindowOpen(evt.target)
    } else {
      if (document.body) {
        patchAllIframeWindowOpen()
      }
    }
  })
})()