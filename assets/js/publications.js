/*
  Renders publications.html from assets/data/publications.bib.

  A small BibTeX reader: enough for the fields we use (title, author, year,
  booktitle/journal, url, plus the custom venue/code/note/award fields), with
  braces, quoted values, nested braces, and the common LaTeX accents and
  escapes. Entries are grouped by year, newest first, and keep their file
  order within a year. See the header comment in publications.bib.

  A toolbar above the list filters by free-text search (title, authors,
  venue, category), category, publication type and year; each entry's
  category tags also act as filters. The current filter is mirrored in the
  query string (?q=&cat=&type=&year=) so a filtered view can be shared.
  Each entry shows its `image` as a thumbnail, or a placeholder with the
  venue and year until one is added.
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

  /* Short venue label for the thumbnail placeholder: the display venue, or,
     when that is long (journals), an acronym such as "IEEE TDSC". */
  function shortVenue(e) {
    var f = e.fields;
    var v = clean(f.venue || f.booktitle || f.journal || f.publisher || f.howpublished || '');
    if (v.length <= 24) return v;
    v = v.replace(/\s*\([^)]*\)/g, '').trim();
    if (v.length <= 24) return v;
    var parts = [];
    var initials = '';
    v.split(/\s+/).forEach(function (w) {
      if (/^[A-Z0-9/&-]{2,}$/.test(w)) {
        if (initials) { parts.push(initials); initials = ''; }
        parts.push(w);
      } else if (!/^(on|of|and|for|the|in|a|an|to)$/i.test(w)) {
        initials += w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase();
      }
    });
    if (initials) parts.push(initials);
    return parts.join(' ');
  }

  /* Lower-case, strip diacritics and straighten quotes, so "Tomas" finds
     "Tomáš" and "nsdi '24" finds "NSDI ’24". */
  function fold(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").toLowerCase();
  }

  function slug(s) {
    return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* Pre-fold a display string for highlight(), keeping a map from each
     folded character back to its position in the original. */
  function foldable(text) {
    var folded = '';
    var map = [];
    for (var i = 0; i < text.length; i++) {
      var f = fold(text[i]);
      for (var j = 0; j < f.length; j++) {
        folded += f[j];
        map.push(i);
      }
    }
    return { text: text, folded: folded, map: map };
  }

  /* Split a foldable() string into text and <mark> nodes around the search
     words it contains. */
  function highlight(t, words) {
    var marks = [];
    words.forEach(function (w) {
      var from = 0;
      var at;
      while ((at = t.folded.indexOf(w, from)) > -1) {
        marks.push([t.map[at], t.map[at + w.length - 1] + 1]);
        from = at + w.length;
      }
    });
    if (!marks.length) return [t.text];
    marks.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var out = [];
    var pos = 0;
    marks.forEach(function (m) {
      if (m[1] <= pos) return;
      var start = Math.max(m[0], pos);
      if (start > pos) out.push(t.text.slice(pos, start));
      out.push(el('mark', null, [t.text.slice(start, m[1])]));
      pos = m[1];
    });
    if (pos < t.text.length) out.push(t.text.slice(pos));
    return out;
  }

  function fill(node, kids) {
    node.textContent = '';
    kids.forEach(function (c) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }

  function placeholder(box, e) {
    box.className = 'pub-thumb pub-thumb--placeholder';
    box.setAttribute('aria-hidden', 'true');
    fill(box, [
      el('span', { 'class': 'pub-thumb-venue' }, [shortVenue(e) || 'Paper']),
      el('span', { 'class': 'pub-thumb-year' }, [e.pubYear])
    ]);
  }

  /* The entry's `image` field if it has one, else (or if the image fails to
     load) a placeholder showing the venue and year. */
  function thumb(e) {
    var src = (e.fields.image || '').trim();
    var box = el('div', { 'class': 'pub-thumb' });
    if (!src) {
      placeholder(box, e);
      return box;
    }
    var img = el('img', { src: src, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', function () { placeholder(box, e); });
    box.appendChild(img);
    return box;
  }

  /* Builds an entry's <li> once; paint() refreshes its search highlights
     and active tag on every filter change. */
  function buildEntry(e) {
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

    /* Text that search matches get highlighted in: [node, foldable text]. */
    e.hl = [];
    function hl(tag, attrs, text) {
      var node = el(tag, attrs, [text]);
      e.hl.push([node, foldable(text)]);
      return node;
    }

    var venue = venueText(e);
    var note = clean(f.note || '');
    var venueNode = null;
    if (venue || note) {
      venueNode = el('p', { 'class': 'pub-venue' }, [
        venue ? hl('span', null, venue) : null,
        note ? el('span', { 'class': 'pub-status' }, [venue ? ' · ' : '', hl('span', null, note)]) : null
      ]);
    }

    e.tags = e.pubCats.map(function (c) {
      return el('button', {
        type: 'button', 'class': 'pub-tag', 'data-cat': slug(c), 'aria-pressed': 'false'
      }, [c]);
    });

    e.node = el('li', { id: e.key }, [
      thumb(e),
      el('div', { 'class': 'pub-body' }, [
        el('div', { 'class': 'pub-head' }, [
          hl('div', { 'class': 'pub-title' }, clean(f.title)),
          linksNode
        ]),
        hl('p', { 'class': 'pub-authors' }, splitAuthors(f.author).join(', ')),
        venueNode,
        f.award ? el('p', { 'class': 'pub-award' }, [hl('span', { 'class': 'pub-note' }, clean(f.award))]) : null,
        e.tags.length ? el('div', { 'class': 'pub-tags' }, e.tags) : null
      ])
    ]);
  }

  function paint(e, words, cat) {
    e.hl.forEach(function (h) { fill(h[0], highlight(h[1], words)); });
    e.tags.forEach(function (b) {
      var on = b.getAttribute('data-cat') === cat;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? 'Show all categories' : 'Show only ' + b.textContent + ' papers';
    });
  }

  /* ---------------------------------------------------------------- */
  /* Filtering                                                        */
  /* ---------------------------------------------------------------- */

  /* Toolbar "Type" options, in display order. Only types that occur in the
     bib file are offered. */
  var TYPES = [
    { id: 'conference', label: 'Conference Paper', match: /^(inproceedings|conference|proceedings|workshop)$/ },
    { id: 'journal', label: 'Journal Article', match: /^article$/ },
    { id: 'preprint', label: 'Preprint', match: /^(misc|techreport|unpublished)$/ },
    { id: 'other', label: 'Other', match: /./ }
  ];

  function typeOf(e) {
    for (var t = 0; t < TYPES.length; t++) {
      if (TYPES[t].match.test(e.type)) return TYPES[t].id;
    }
    return 'other';
  }

  function yearOf(e) {
    return clean(e.fields.year || '') || 'Other';
  }

  /* `category = {A, B}`: comma- or semicolon-separated, primary first. */
  function categoriesOf(e) {
    var seen = {};
    return (e.fields.category || '').split(/[,;]/).map(clean).filter(function (c) {
      var s = slug(c);
      if (!s || seen[s]) return false;
      seen[s] = true;
      return true;
    });
  }

  function prepare(e) {
    var f = e.fields;
    e.pubType = typeOf(e);
    e.pubYear = yearOf(e);
    e.pubCats = categoriesOf(e);
    e.catSlugs = e.pubCats.map(slug);
    e.haystack = fold([
      clean(f.title), splitAuthors(f.author).join(' '), venueText(e),
      clean(f.booktitle || ''), clean(f.journal || ''), clean(f.howpublished || ''),
      clean(f.note || ''), clean(f.award || ''), e.pubCats.join(' '), e.pubYear, e.key
    ].join(' '));
  }

  function searchWords(q) {
    return fold(q).split(/\s+/).filter(Boolean);
  }

  /* `skip` names one filter to ignore, for counting that menu's options. */
  function matches(e, state, words, skip) {
    if (skip !== 'type' && state.type && e.pubType !== state.type) return false;
    if (skip !== 'year' && state.year && e.pubYear !== state.year) return false;
    if (skip !== 'cat' && state.cat && e.catSlugs.indexOf(state.cat) < 0) return false;
    for (var w = 0; w < words.length; w++) {
      if (e.haystack.indexOf(words[w]) < 0) return false;
    }
    return true;
  }

  function sortYears(years) {
    return years.sort(function (a, b) {
      var na = parseInt(a, 10), nb = parseInt(b, 10);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return nb - na;
    });
  }

  var PARAMS = ['q', 'type', 'cat', 'year'];

  function readQuery() {
    var params = new URLSearchParams(location.search);
    var state = {};
    PARAMS.forEach(function (k) { state[k] = params.get(k) || ''; });
    return state;
  }

  function writeQuery(state) {
    var params = new URLSearchParams(location.search);
    PARAMS.forEach(function (k) {
      if (state[k]) params.set(k, state[k]);
      else params.delete(k);
    });
    var qs = params.toString();
    try {
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (err) {}
  }

  function select(id, label, allLabel, options, value, extraClass) {
    var sel = el('select', { id: id, 'class': 'pub-select' },
      [el('option', { value: '' }, [allLabel])].concat(options.map(function (o) {
        return el('option', { value: o.value, 'data-label': o.label }, [o.label]);
      })));
    sel.value = options.some(function (o) { return o.value === value; }) ? value : '';
    return el('div', { 'class': 'pub-field' + (extraClass ? ' ' + extraClass : '') }, [
      el('label', { 'for': id }, [label]),
      sel
    ]);
  }

  function tally(entries, keyOf) {
    var counts = {};
    var order = [];
    entries.forEach(function (e) {
      [].concat(keyOf(e)).forEach(function (k) {
        if (!counts[k]) { counts[k] = 0; order.push(k); }
        counts[k]++;
      });
    });
    return { counts: counts, order: order };
  }

  function setup(entries) {
    entries.forEach(prepare);
    entries.forEach(buildEntry);

    var types = tally(entries, function (e) { return e.pubType; });
    var years = tally(entries, function (e) { return e.pubYear; });
    /* Categories are keyed by slug, so "Systems for ai" and "Systems for
       AI" are one option; the first spelling seen is the one shown. */
    var cats = tally(entries, function (e) { return e.catSlugs; });
    var catLabel = {};
    entries.forEach(function (e) {
      e.catSlugs.forEach(function (c, i) {
        if (!catLabel[c]) catLabel[c] = e.pubCats[i];
      });
    });
    sortYears(years.order);
    /* Most-used categories first. */
    var catOrder = cats.order.slice().sort(function (a, b) {
      return cats.counts[b] - cats.counts[a] || catLabel[a].localeCompare(catLabel[b]);
    });

    var state = readQuery();

    var search = el('input', {
      id: 'pub-q', 'class': 'pub-search', type: 'search',
      placeholder: 'Title, author, venue, or topic', autocomplete: 'off'
    });
    search.value = state.q;

    var fields = [
      el('div', { 'class': 'pub-field pub-field--search' }, [
        el('label', { 'for': 'pub-q' }, ['Search']),
        search
      ])
    ];
    var catSelect = null;
    if (catOrder.length) {
      var catField = select('pub-cat', 'Category', 'All categories',
        catOrder.map(function (c) { return { value: c, label: catLabel[c] }; }),
        state.cat, 'pub-field--cat');
      catSelect = catField.querySelector('select');
      fields.push(catField);
    }
    var typeSelect = select('pub-type', 'Type', 'All types',
      TYPES.filter(function (t) { return types.counts[t.id]; })
        .map(function (t) { return { value: t.id, label: t.label }; }),
      state.type);
    var yearSelect = select('pub-year', 'Date', 'All years',
      years.order.map(function (y) { return { value: y, label: y }; }),
      state.year);
    fields.push(typeSelect, yearSelect);
    typeSelect = typeSelect.querySelector('select');
    yearSelect = yearSelect.querySelector('select');

    var form = el('form', { 'class': 'pub-toolbar', role: 'search', 'aria-label': 'Filter publications' }, fields);
    var count = el('p', { 'class': 'pub-count', role: 'status' });
    var reset = el('button', { type: 'button', 'class': 'pub-reset' }, ['Clear filters']);
    var summary = el('div', { 'class': 'pub-summary' }, [count, reset]);
    var results = el('div', { 'class': 'pub-results' });

    function current() {
      return {
        q: search.value.trim(),
        type: typeSelect.value,
        cat: catSelect ? catSelect.value : '',
        year: yearSelect.value
      };
    }

    /* Each option's "(n)" is how many papers it would show given the
       search and the other two menus. */
    function recount(sel, dim, keysOf, s, words) {
      if (!sel) return;
      var n = {};
      entries.forEach(function (e) {
        if (!matches(e, s, words, dim)) return;
        [].concat(keysOf(e)).forEach(function (k) { n[k] = (n[k] || 0) + 1; });
      });
      [].forEach.call(sel.options, function (o) {
        if (o.value) o.textContent = o.getAttribute('data-label') + ' (' + (n[o.value] || 0) + ')';
      });
    }

    function update() {
      var s = current();
      var words = searchWords(s.q);
      var shown = entries.filter(function (e) { return matches(e, s, words); });
      shown.forEach(function (e) { paint(e, words, s.cat); });
      render(shown, results);
      recount(catSelect, 'cat', function (e) { return e.catSlugs; }, s, words);
      recount(typeSelect, 'type', function (e) { return e.pubType; }, s, words);
      recount(yearSelect, 'year', function (e) { return e.pubYear; }, s, words);
      var filtered = s.q || s.type || s.cat || s.year;
      var text = filtered
        ? 'Showing ' + shown.length + ' of ' + entries.length + ' publications'
        : entries.length + ' publications';
      /* Only touch the live region when the message changes. */
      if (count.textContent !== text) count.textContent = text;
      reset.hidden = !filtered;
      if (!shown.length) {
        results.appendChild(el('p', { 'class': 'pub-empty' }, ['No publications match these filters.']));
      }
      writeQuery(s);
    }

    form.addEventListener('submit', function (ev) { ev.preventDefault(); });
    /* Search boxes and selects both fire 'input'; no 'change' listener, or
       every select change would render twice. */
    form.addEventListener('input', update);

    /* Scroll the toolbar into view if it is above or under the sticky
       header (its scroll-margin-top clears the header). */
    function reveal() {
      var header = document.querySelector('.site-header');
      var top = header && getComputedStyle(header).position === 'sticky'
        ? header.getBoundingClientRect().bottom : 0;
      if (form.getBoundingClientRect().top < top) form.scrollIntoView();
    }

    reset.addEventListener('click', function () {
      form.reset();
      update();
      search.focus({ preventScroll: true });
      reveal();
    });

    /* A category tag filters by that category; clicking the active tag
       clears it. Focus moves to the Category menu, which shows the choice. */
    results.addEventListener('click', function (ev) {
      var tag = ev.target.closest('.pub-tag');
      if (!tag || !catSelect) return;
      var c = tag.getAttribute('data-cat');
      catSelect.value = catSelect.value === c ? '' : c;
      update();
      catSelect.focus({ preventScroll: true });
      reveal();
    });

    root.innerHTML = '';
    root.removeAttribute('aria-live');
    root.appendChild(form);
    root.appendChild(summary);
    root.appendChild(results);
    update();

    /* Honor a #key link that arrived before the list existed. */
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  function render(entries, container) {
    var byYear = {};
    var years = [];
    entries.forEach(function (e) {
      var y = e.pubYear;
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(e.node);
    });
    sortYears(years);

    var frag = document.createDocumentFragment();
    years.forEach(function (y) {
      frag.appendChild(el('h2', { id: 'y' + y }, [y]));
      frag.appendChild(el('ul', { 'class': 'pub-list' }, byYear[y]));
    });
    container.textContent = '';
    container.appendChild(frag);
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
      setup(entries);
    })
    .catch(function (err) {
      fail('The publication list could not be loaded (' + err.message + '). See Google Scholar for the full list.');
    });
})();
