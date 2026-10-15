# Morning PDX

A small, map-first guide to six Portland coffee shops and six doughnut shops. The picks are editorial, not ranked; each stop links to its business and to directions.

## Run locally

With Python installed:

```powershell
python -m http.server 4173 --directory site
```

Then open `http://localhost:4173`.

## Validate

Node.js 22 is used in CI:

```powershell
npm ci
npm run check
```

The GitHub Actions workflow validates pull requests and pushes to `main`. A successful push to `main` deploys the contents of `site/` to GitHub Pages.

## Updating the shortlist

Edit `site/places.js` to add or update a stop. Keep the address, coordinates, neighborhood, signature note, official business URL, and map-to-list identity together. Opening hours are intentionally not listed because they change; visitors are directed to the businesses for current details.

The descriptions are informed by the businesses' public information and [Travel Portland's coffee guide](https://www.travelportland.com/culture/coffee/) and [doughnut guide](https://www.travelportland.com/culture/doughnut-shops-in-portland/). The map uses OpenStreetMap tiles and displays its required attribution in the map.
