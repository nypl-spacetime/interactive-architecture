# interactive-architecture

Interactive architecture diagrams for JavaScript. With links to GitHub repositories!

## Examples

- Example:
  - diagram: http://spacetime.nypl.org/interactive-architecture/example
  - source code: [`example/index.html`](example/index.html)
- NYC Space/Time Directory architecture:
  - diagram: http://spacetime.nypl.org/architecture
  - source code: https://github.com/nypl-spacetime/architecture

## Usage

Add JavaScript and CSS files to your web page:

```html
<head>
  <script src="http://spacetime.nypl.org/interactive-architecture/js/d3.v4.min.js" charset="utf-8"></script>
  <script src="http://spacetime.nypl.org/interactive-architecture/js/interactive-architecture.js" charset="utf-8"></script>
  <link rel="stylesheet" href="http://spacetime.nypl.org/interactive-architecture/css/interactive-architecture.css">
  <link rel="stylesheet" href="http://spacetime.nypl.org/interactive-architecture/css/markdown-popup.css">
</head>
```

Add a container for the diagram:

```html
<body>
  <article>
    <div id='architecture'>
    </div>
  <article>
</body>
```

Create the interactive architecture diagram:

```js
var config = {
  getHref: function (link) {
    return link.getAttribute('xl:href')
  },
  getStyle: function (href, link) {
    return {
      fill: 'rgba(255, 255, 255, 0)',
      strokeWidth: '2px'
    }
  },
  getPopupContents: function (href, link) {
    if (href.indexOf('https://github.com') >= 0) {
      return iA.gitHub.getReadme(href)
    }
  }
}

iA.architecture.create('#architecture', 'architecture.svg', config)
```
