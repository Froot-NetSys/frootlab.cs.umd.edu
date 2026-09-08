/*
  Renders publications.html from assets/data/publications.bib.

  A small BibTeX reader: enough for the fields we use (title, author, year,
  booktitle/journal, url, plus the custom venue/code/note/award fields), with
  braces, quoted values, nested braces, and the common LaTeX accents and
  escapes. Entries are grouped by year, newest first, and keep their file
  order within a year. See the header comment in publications.bib.
*/
(function () {
  var root = document.getElementById('pub-root');
  if (!root) return;

  var BIB_URL = root.getAttribute('data-bib') || 'assets/data/publications.bib';

  /* ---------------------------------------------------------------- */
  /* Parsing                                                          */
  /* ---------------------------------------------------------------- */

  function parseBib(text) {
    var entries = [];
    var i = 0;
    var n = text.length;

    function skipWs() {
      while (i < n && /\s/.test(text[i])) i++;
    }

    function readBraced() {
      /* text[i] === '{' */
      var depth = 0;
      var start = i;
      for (; i < n; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            return text.slice(start + 1, i - 1);
          }
        }
      }
      return text.slice(start + 1);
    }

    function readQuoted() {
      /* text[i] === '"' */
      var start = ++i;
      var depth = 0;
      for (; i < n; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        else if (text[i] === '"' && depth === 0) {
          return text.slice(start, i++);
        }
      }
      return text.slice(start);
    }

    function readValue() {
      skipWs();
      var parts = [];
      for (;;) {
        skipWs();
        if (text[i] === '{') parts.push(readBraced());
        else if (text[i] === '"') parts.push(readQuoted());
        else {
          var m = /^[^,}\s#]+/.exec(text.slice(i));
          if (!m) break;
          parts.push(m[0]);
          i += m[0].length;
        }
        skipWs();
        if (text[i] === '#') { i++; continue; }
        break;
      }
      return parts.join('');
    }

    while (i < n) {
      var at = text.indexOf('@', i);
      if (at < 0) break;
      i = at + 1;
      var typeMatch = /^\s*([A-Za-z]+)\s*[{(]/.exec(text.slice(i));
      if (!typeMatch) continue;
      var type = typeMatch[1].toLowerCase();
      i += typeMatch[0].length;
      if (type === 'comment' || type === 'preamble' || type === 'string') {
        /* skip to the matching close */
        var depth = 1;
        while (i < n && depth > 0) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          i++;
        }
        continue;
      }
      skipWs();
      var keyMatch = /^([^,\s]+)\s*,/.exec(text.slice(i));
      if (!keyMatch) continue;
      var entry = { type: type, key: keyMatch[1], fields: {} };
      i += keyMatch[0].length;

      for (;;) {
        skipWs();
        if (text[i] === '}' || text[i] === ')') { i++; break; }
        var nameMatch = /^([A-Za-z_][\w-]*)\s*=/.exec(text.slice(i));
        if (!nameMatch) { i++; continue; }
        i += nameMatch[0].length;
        entry.fields[nameMatch[1].toLowerCase()] = readValue();
        skipWs();
        if (text[i] === ',') i++;
      }
      entries.push(entry);
    }
    return entries;
  }

  var ACCENTS = {
    "'": '́', '`': '̀', '^': '̂', '"': '̈', '~': '̃',
    '=': '̄', '.': '̇', 'u': '̆', 'v': '̌', 'H': '̋',
    'c': '̧', 'k': '̨', 'r': '̊', 'd': '̣', 'b': '̱'
  };

  function clean(s) {
    if (!s) return '';
    s = s
      /* accents: {\'e}, \'e, \'{e}, \c{c} */
      .replace(/\{?\\([`'^"~=.uvHckrdb])\s*\{?\\?([A-Za-z])\}?\}?/g, function (_, acc, ch) {
        return (ch + (ACCENTS[acc] || '')).normalize('NFC');
      })
      .replace(/\\(ss)\b/g, 'ß')
      .replace(/\\(o)\b/g, 'ø').replace(/\\(O)\b/g, 'Ø')
      .replace(/\\(ae)\b/g, 'æ').replace(/\\(AE)\b/g, 'Æ')
      .replace(/\\(aa)\b/g, 'å').replace(/\\(AA)\b/g, 'Å')
      .replace(/\\(l)\b/g, 'ł').replace(/\\(L)\b/g, 'Ł')
      .replace(/\\([#&%$_{}])/g, '$1')
      .replace(/---/g, '—').replace(/--/g, '–')
      .replace(/``|''/g, '"')
      .replace(/\\emph\{([^}]*)\}/g, '$1')
      .replace(/\\textbf\{([^}]*)\}/g, '$1')
      .replace(/\\[a-zA-Z]+\s*/g, '')
      .replace(/[{}]/g, '')
      .replace(/~/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }

  function splitAuthors(s) {
    if (!s) return [];
    /* split on " and " outside braces */
    var parts = [];
    var depth = 0;
    var cur = '';
    for (var j = 0; j < s.length; j++) {
      var ch = s[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0 && /\s/.test(ch) && /^\s+and\s+/i.test(s.slice(j))) {
        parts.push(cur);
        cur = '';
        j += /^\s+and\s+/i.exec(s.slice(j))[0].length - 1;
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts.map(function (name) {
      name = clean(name);
      if (name.toLowerCase() === 'others') return 'et al.';
      var comma = name.indexOf(',');
      if (comma > -1) {
        /* "Last, First" -> "First Last" */
        return (name.slice(comma + 1).trim() + ' ' + name.slice(0, comma).trim()).trim();
      }
      return name;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Rendering                                                        */
  /* ---------------------------------------------------------------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function link(href, label) {
    return el('a', { href: href, target: '_blank', rel: 'noopener' }, [label]);
  }

  function venueText(e) {
    var f = e.fields;
    var v = clean(f.venue || f.booktitle || f.journal || f.publisher || f.howpublished || '');
    var year = clean(f.year || '');
    var isConf = /^(inproceedings|conference|proceedings|workshop)$/.test(e.type) || !!f.booktitle;
    if (v && isConf && year.length === 4) v += ' ’' + year.slice(2);
    return v;
  }

  function renderEntry(e) {
    var f = e.fields;
    var links = [];
    if (f.url) links.push(link(f.url.trim(), 'Paper'));
    else if (f.pdf) links.push(link(f.pdf.trim(), 'Paper'));
    if (f.code) links.push(link(f.code.trim(), 'Code'));
    if (f.slides) links.push(link(f.slides.trim(), 'Slides'));
    if (f.blog) links.push(link(f.blog.trim(), 'Blog'));

    var linksNode = null;
    if (links.length) {
      var kids = [];
      links.forEach(function (a, idx) {
        if (idx) kids.push(' · ');
        kids.push(a);
      });
      linksNode = el('p', { 'class': 'pub-links' }, kids);
    }

    var venue = venueText(e);
    var venueKids = [venue];
    if (f.note) venueKids.push(el('span', { 'class': 'pub-status' }, [(venue ? ' · ' : '') + clean(f.note)]));

    var li = el('li', { id: e.key }, [
      el('div', { 'class': 'pub-head' }, [
        el('div', { 'class': 'pub-title' }, [clean(f.title)]),
        linksNode
      ]),
      el('p', { 'class': 'pub-authors' }, [splitAuthors(f.author).join(', ')]),
      venue || f.note ? el('p', { 'class': 'pub-venue' }, venueKids) : null,
      f.award ? el('p', { 'class': 'pub-award' }, [el('span', { 'class': 'pub-note' }, [clean(f.award)])]) : null
    ]);
    return li;
  }

  function render(entries) {
    var byYear = {};
    var years = [];
    entries.forEach(function (e) {
      var y = clean(e.fields.year || '') || 'Other';
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(e);
    });
    years.sort(function (a, b) {
      var na = parseInt(a, 10), nb = parseInt(b, 10);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return nb - na;
    });

    var frag = document.createDocumentFragment();
    years.forEach(function (y) {
      frag.appendChild(el('h2', { id: 'y' + y }, [y]));
      frag.appendChild(el('ul', { 'class': 'pub-list' }, byYear[y].map(renderEntry)));
    });
    root.innerHTML = '';
    root.appendChild(frag);

    /* Honor a #key link that arrived before the list existed. */
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  function fail(msg) {
    root.innerHTML = '';
    root.appendChild(el('p', { 'class': 'pub-error' }, [msg]));
  }

  fetch(BIB_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.text();
    })
    .then(function (text) {
      var entries = parseBib(text);
      if (!entries.length) throw new Error('no entries found');
      render(entries);
    })
    .catch(function (err) {
      fail('The publication list could not be loaded (' + err.message + '). See Google Scholar for the full list.');
    });
})();
