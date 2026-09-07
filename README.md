# frootlab.cs.umd.edu

Static site for the FROOT Lab (Prof. Alan Zaoxing Liu), Department of Computer Science, University of Maryland.

This replaces the site's previous WordPress install. No build step, no server-side code — just plain HTML/CSS/JS, so anyone can edit a page and open a pull request.

## Structure

```
index.html          Home page (hero, about, news, projects, publications, join/contact)
projects.html        Full projects list
publications.html    Full publications list
team.html            Team roster
assets/css/style.css  Site styles (design ported from the old WordPress theme)
assets/js/theme.js    Mobile nav toggle
assets/img/           Logo and favicon
```

## Editing content

Each page is plain HTML — open the file, find the relevant `<article class="card">` block, and copy/edit/add blocks as needed. Comments in `projects.html`, `publications.html`, and `team.html` show the pattern to repeat for new entries.

## Local preview

From this directory:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Deploying

Upload the contents of this directory to the web root (`public_html`) of the hosting account. There is nothing to build — copy the files as-is.
