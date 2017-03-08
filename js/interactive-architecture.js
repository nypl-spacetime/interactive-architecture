var iA = function () {

  var utils = {
    fragmentFromString: function (htmlStr) {
      return document.createRange().createContextualFragment(htmlStr)
    },

    objectType: function (obj) {
      return Object.prototype.toString.call(obj).slice(8, -1)
    }
  }

  var cache = {
    ttl: 60 * 60 * 1000,

    getItem: function (key) {
      try {
        var str = localStorage.getItem(key)
        var obj = JSON.parse(str)

        var timestamp = Date.now()

        if (obj.timestamp > 0 && obj.timestamp + this.ttl > timestamp) {
          return obj.data
        } else {
          return undefined
        }
      } catch (err) {
        return undefined
      }
    },

    setItem: function (key, data) {
      var timestamp = Date.now()

      var str = JSON.stringify({
        timestamp: timestamp,
        data: data
      })

      localStorage.setItem(key, str)
    }
  }

  var gitHub = {
    hrefToOrgRepo: function (href) {
      var match = href.match(/github\.com\/(.*)\/(.*)\/?$/)
      var org = match[1]
      var repo = match[2]

      return {
        org: org,
        repo: repo
      }
    },

    makeAbsolute: function (baseUrl, url) {
      var currentUrl = window.location.href.replace(window.location.hash, '')
      if (url.startsWith(currentUrl)) {
        return url.replace(currentUrl, baseUrl)
      }

      return url
    },

    fixRelativeLinks: function (org, repo, html) {
      if (html) {
        var baseUrl = 'https://raw.githubusercontent.com/' + org + '/' + repo + '/master/'

        var srcs = html.querySelectorAll('*[src]')
        for (var i = 0; i < srcs.length; ++i) {
          srcs[i].src = this.makeAbsolute(baseUrl, srcs[i].src)
        }

        var hrefs = html.querySelectorAll('*[href]')
        for (var i = 0; i < hrefs.length; ++i) {
          hrefs[i].href = this.makeAbsolute(baseUrl, hrefs[i].href)
        }
      }

      return html
    },

    getReadme: function (org, repo) {
      if (repo === undefined) {
        var orgRepo = this.hrefToOrgRepo(org)
        org = orgRepo.org
        repo = orgRepo.repo
      }

      var _this = this

      return new Promise(function (resolve, reject) {
        var contents
        var apiUrl = 'https://api.github.com/repos/' + org + '/' + repo + '/readme'
        var data = cache.getItem(apiUrl)

        if (data && data.success && data.htmlStr) {
          resolve(_this.fixRelativeLinks(org, repo, utils.fragmentFromString(data.htmlStr)))
        } else if (data && !data.success) {
          reject(data.error)
        } else {
          d3.html(apiUrl)
            .header('Accept', 'application/vnd.github.VERSION.html')
            .get(function(err, html) {
              if (err) {
                var errorMessage = 'Error loading README file from GitHub API'

                try {
                  var response = JSON.parse(err.currentTarget.response)
                  var status = err.currentTarget.status

                  errorMessage = errorMessage + ': ' + response.message + ' (' + status + ')'
                } catch (e) {
                }

                cache.setItem(apiUrl, {
                  success: false,
                  error: errorMessage
                })
                reject(errorMessage)
              } else {
                htmlStr = new XMLSerializer().serializeToString(html)
                cache.setItem(apiUrl, {
                  success: true,
                  htmlStr: htmlStr
                })
                resolve(_this.fixRelativeLinks(org, repo, html))
              }
            })
        }
      })
    }
  }

  var architecture = {
    currentPopupHref: undefined,

    popupHtml: '' +
      '<div class="interactive-architecture-popup arrow-box hidden">' +
      '  <div class="interactive-architecture-popup-link">' +
      '    <a href="" target="_blank">Open this link in a new window</a>' +
      '  </div>' +
      '  <div class="interactive-architecture-popup-contents">' +
      '  </div>' +
      '</div>',

    getPopupLocation: function (element) {
      var rect = element.getBoundingClientRect()

      return {
        x: window.scrollX + rect.left + rect.width / 2,
        y: window.scrollY + rect.bottom + 5
      }
    },

    createBadge: function (svg, link, number) {
      var bbox = link.getBBox()
      var radius = 18

      var badge = d3.select(svg).append('g')
        .attr('class', 'badge')

      badge.append('circle')
        .attr('cx', bbox.x + bbox.width)
        .attr('cy', bbox.y)
        .attr('r', radius)

      var transform = 'translate(' +
        Math.round(bbox.x + bbox.width) + ' ' +
        Math.round(bbox.y + radius / 2 - 1) +
        ')'
      badge.append('text')
          .attr('transform', transform)
          .html(number)
    },

    popupStyle: undefined,

    getPopupStyle: function (width, diffX) {
      var left = Math.round((width / 2 + diffX) / width * 100)
      return '' +
        '.interactive-architecture .arrow-box:after, \n' +
        '.interactive-architecture .arrow-box:before {\n' +
        '  left: ' + left + '%;\n' +
        '}\n'
    },

    createPopup: function (svg, href, location, contents) {
      this.hidePopup()

      this.currentPopupHref = href

      var parentNode = svg.parentNode

      var fragment = utils.fragmentFromString(this.popupHtml)
      parentNode.appendChild(fragment)

      var popup = parentNode.querySelector('.interactive-architecture-popup')
      this.popup = popup

      var popupStyle = window.getComputedStyle(popup)
      var popupWidth = parseInt(popupStyle.width.replace('px', ''))

      location.x -= Math.round(popupWidth / 2)

      // TODO: make padding configurable
      var padding = 10
      var minX = padding
      var maxX = document.body.clientWidth - padding - popupWidth
      var diffX = 0

      if (location.x < minX) {
        diffX = location.x - minX
        location.x = minX
      } else if (location.x > maxX) {
        diffX = location.x - maxX
        location.x = maxX
      }

      if (!this.popupStyle) {
        this.popupStyle = document.createElement('style')
        document.head.appendChild(this.popupStyle)
      }
      this.popupStyle.innerHTML = this.getPopupStyle(popupWidth, diffX)

      d3.select(popup)
        .classed('hidden', false)
        .style('left', location.x + 'px')
        .style('top', location.y + 'px')

      // Set href of README link
      popup.querySelector('.interactive-architecture-popup-link a').href = href

      var popupContents = popup.querySelector('.interactive-architecture-popup-contents')
      var contentsType = utils.objectType(contents)

      if (contentsType === 'DocumentFragment') {
        popupContents.appendChild(contents)
      } else {
        popupContents.innerHTML = contents
      }
    },

    hidePopup: function () {
      if (this.popup) {
        this.popup.remove()
        this.popup = undefined
      }
      this.currentPopupHref = undefined
    },

    create: function (container, svgUrl, userConfig) {
      var _this = this

      var defaultConfig = {
        getHref: function (link) {
          return link.getAttribute('xl:href')
        },
        getStyle: function (href, link) {
        },
        getPopupContents: function (href, link) {
        },
        getBadgeNumber: function (href, link) {
        }
      }

      var config = Object.assign(defaultConfig, userConfig)

      d3.xml(svgUrl, function (err, doc) {
        if (err) {
          console.error('Failed loading architecture diagram: ' + svgUrl)
          return
        }

        var svg = doc.querySelector('svg')

        // Set SVG height & width
        svg.removeAttribute('height', null)

        // Append SVG document to HTML
        var containerElement = document.querySelector(container)

        containerElement.className += ' interactive-architecture'
        containerElement.appendChild(doc.documentElement)

        // Remove all elements with white background (just leaving the outline)
        var whiteElements = svg.querySelectorAll('[fill="white"]')
        svg.style.fill = 'none'
        Array.prototype.forEach.call(whiteElements, function (element) {
          element.parentNode.removeChild(element)
        })

        // Remove title elements, they cause annoying mouse tooltips
        var titles = svg.querySelectorAll('title')
        Array.prototype.forEach.call(titles, function (element) {
          element.parentNode.removeChild(element)
        })

        var links = svg.querySelectorAll('a')
        Array.prototype.forEach.call(links, function (link) {
          var href = config.getHref(link)

          var path = link.querySelector('path')
          Object.assign(path.style, config.getStyle(href, link) || {})

          link.addEventListener('click', function (event) {
            event.stopPropagation()
            event.preventDefault()

            if (_this.currentPopupHref !== href) {
              _this.hidePopup()
              var contents = config.getPopupContents(href, link)
              var contentsType = utils.objectType(contents)

              if (contentsType === 'Promise') {
                contents
                  .then(function (contents) {
                    _this.createPopup(svg, href, _this.getPopupLocation(link), contents)
                  })
                  .catch(function (err) {
                    var message = err || err.message
                    var errorContents = '<span class="interactive-architecture-popup-error">' +
                      message + '</span>'
                    _this.createPopup(svg, href, _this.getPopupLocation(link), errorContents)
                  })
              } else {
                _this.createPopup(svg, href, _this.getPopupLocation(link), contents)
              }
            } else {
              _this.hidePopup()
            }
          })

          var badgeNumber = config.getBadgeNumber(href, link)
          if (badgeNumber !== undefined && badgeNumber !== null) {
            this.createBadge(svg, link, badgeNumber)
          }
        })
      })

      document.addEventListener('click', function () {
        _this.hidePopup()
      })
    }
  }

  return {
    utils: utils,
    cache: cache,
    gitHub: gitHub,
    architecture: architecture
  }
}()
