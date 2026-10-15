import { PLACES } from "./places.js";

const CATEGORY_LABELS = {
  coffee: "Coffee",
  doughnut: "Doughnuts"
};

const state = {
  category: "all",
  query: "",
  selectedId: null
};

const placeList = document.querySelector("#place-list");
const emptyState = document.querySelector("#empty-state");
const resultsCount = document.querySelector("#results-count");
const searchInput = document.querySelector("#place-search");
const clearSearchButton = document.querySelector("#clear-search");
const mapStatus = document.querySelector("#map-status");
const mapAlert = document.querySelector("#map-alert");
const mapElement = document.querySelector("#map");
const allBounds = [];
const markersById = new Map();
let map;
let markerLayer;
let tileErrorShown = false;

function directionsUrl(place) {
  const destination = encodeURIComponent(`${place.name}, ${place.address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

function makeExternalLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  return link;
}

function makePlaceItem(place) {
  const item = document.createElement("li");
  item.className = "place-item";
  item.dataset.placeId = place.id;

  const button = document.createElement("button");
  button.className = "place-select";
  button.type = "button";
  button.dataset.placeId = place.id;
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `details-${place.id}`);

  const number = document.createElement("span");
  number.className = "place-number";
  number.textContent = place.number;

  const summary = document.createElement("span");
  summary.className = "place-summary";

  const name = document.createElement("span");
  name.className = "place-name";
  name.textContent = place.name;

  const neighborhood = document.createElement("span");
  neighborhood.className = "place-neighborhood";
  neighborhood.textContent = place.neighborhood;

  const category = document.createElement("span");
  category.className = "place-category";
  category.textContent = CATEGORY_LABELS[place.category];

  summary.append(name, neighborhood);
  button.append(number, summary, category);
  item.append(button);

  const details = document.createElement("div");
  details.className = "place-detail";
  details.id = `details-${place.id}`;
  details.hidden = true;

  const address = document.createElement("p");
  address.className = "place-address";
  address.textContent = place.address;

  const note = document.createElement("p");
  note.className = "place-note";
  note.textContent = place.note;

  const actions = document.createElement("div");
  actions.className = "place-actions";
  actions.append(
    makeExternalLink("Business details", place.website),
    makeExternalLink("Get directions", directionsUrl(place))
  );

  details.append(address, note, actions);
  item.append(details);
  return item;
}

function visiblePlaces() {
  const query = state.query.trim().toLocaleLowerCase();
  return PLACES.filter((place) => {
    const matchesCategory = state.category === "all" || place.category === state.category;
    const searchable = `${place.name} ${place.neighborhood} ${place.address} ${place.note}`.toLocaleLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });
}

function updateSelectionDetails() {
  for (const item of placeList.querySelectorAll(".place-item")) {
    const selected = item.dataset.placeId === state.selectedId;
    const button = item.querySelector(".place-select");
    item.classList.toggle("is-selected", selected);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-expanded", String(selected));
    item.querySelector(".place-detail").hidden = !selected;
  }

  for (const [id, marker] of markersById) {
    const place = PLACES.find((candidate) => candidate.id === id);
    if (place) marker.setIcon(makeStopIcon(place, id === state.selectedId));
  }
}

function renderList() {
  const matches = visiblePlaces();
  placeList.replaceChildren(...matches.map(makePlaceItem));
  emptyState.hidden = matches.length > 0;
  resultsCount.textContent = `${matches.length} ${matches.length === 1 ? "stop" : "stops"}`;
  document.querySelectorAll("[data-category]").forEach((button) => {
    const active = button.dataset.category === state.category;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const counts = {
    all: PLACES.length,
    coffee: PLACES.filter((place) => place.category === "coffee").length,
    doughnut: PLACES.filter((place) => place.category === "doughnut").length
  };
  for (const [category, count] of Object.entries(counts)) {
    const countElement = document.querySelector(`[data-count="${category}"]`);
    if (countElement) countElement.textContent = String(count);
  }

  clearSearchButton.hidden = state.query.length === 0;
  updateSelectionDetails();
  updateMarkers(matches);
}

function makeStopIcon(place, selected = false) {
  const categoryClass = place.category === "coffee" ? "stop-marker--coffee" : "stop-marker--doughnut";
  const selectedClass = selected ? " is-active" : "";
  return L.divIcon({
    className: `stop-marker ${categoryClass}${selectedClass}`,
    html: `<span class="stop-marker__label">${place.number}</span>`,
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15]
  });
}

function makePopup(place) {
  const popup = document.createElement("article");
  popup.className = "map-popup";

  const type = document.createElement("p");
  type.className = "map-popup-type";
  type.textContent = `${place.number} · ${CATEGORY_LABELS[place.category]} · ${place.neighborhood}`;

  const title = document.createElement("h3");
  title.className = "map-popup-title";
  title.textContent = place.name;

  const address = document.createElement("p");
  address.className = "map-popup-address";
  address.textContent = place.address;

  const note = document.createElement("p");
  note.className = "map-popup-note";
  note.textContent = place.note;

  const actions = document.createElement("div");
  actions.className = "map-popup-actions";
  actions.append(
    makeExternalLink("Business details", place.website),
    makeExternalLink("Get directions", directionsUrl(place))
  );

  popup.append(type, title, address, note, actions);
  return popup;
}

function updateMarkers(matches) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  for (const place of matches) {
    const marker = markersById.get(place.id);
    if (marker) markerLayer.addLayer(marker);
  }

  if (state.selectedId && !matches.some((place) => place.id === state.selectedId)) {
    state.selectedId = null;
    updateSelectionDetails();
  }
}

function selectPlace(id, openPopup = true) {
  const place = PLACES.find((candidate) => candidate.id === id);
  if (!place) return;

  state.selectedId = id;
  updateSelectionDetails();
  mapStatus.textContent = `${place.name} · ${place.neighborhood}`;

  const marker = markersById.get(id);
  if (!marker || !openPopup) return;

  const showPopup = () => {
    map.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    marker.openPopup();
  };
  if (typeof markerLayer.zoomToShowLayer === "function") {
    markerLayer.zoomToShowLayer(marker, showPopup);
  } else {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15));
    showPopup();
  }
}

function showMapUnavailable(message) {
  mapAlert.textContent = message;
  mapAlert.hidden = false;
  mapElement.hidden = true;
}

function initializeMap() {
  if (!window.L) {
    showMapUnavailable("The map couldn't load. The shortlist and each stop's directions link are still available.");
    return;
  }

  map = L.map(mapElement, {
    scrollWheelZoom: false,
    zoomControl: false,
    minZoom: 11,
    maxZoom: 18
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 34
      })
    : L.featureGroup();
  markerLayer.addTo(map);

  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  });
  tileLayer.on("tileerror", () => {
    if (tileErrorShown) return;
    tileErrorShown = true;
    mapAlert.textContent = "Some map tiles couldn't load. The shortlist and directions links are still available.";
    mapAlert.hidden = false;
  });
  tileLayer.addTo(map);

  for (const place of PLACES) {
    const marker = L.marker([place.lat, place.lng], {
      title: `${place.number} ${place.name}`,
      alt: `${place.number} ${place.name}`,
      keyboard: true,
      icon: makeStopIcon(place)
    });
    marker.bindPopup(makePopup(place), { maxWidth: 290 });
    marker.on("click", () => {
      state.selectedId = place.id;
      updateSelectionDetails();
      mapStatus.textContent = `${place.name} · ${place.neighborhood}`;
    });
    markersById.set(place.id, marker);
    markerLayer.addLayer(marker);
    allBounds.push([place.lat, place.lng]);
  }

  map.fitBounds(allBounds, { padding: [30, 30], maxZoom: 13 });
}

placeList.addEventListener("click", (event) => {
  const button = event.target.closest(".place-select");
  if (button) selectPlace(button.dataset.placeId);
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;
    state.selectedId = null;
    mapStatus.textContent = "Select a numbered stop to see the details.";
    renderList();
  });
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  state.selectedId = null;
  mapStatus.textContent = "Select a numbered stop to see the details.";
  renderList();
});

clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  state.selectedId = null;
  mapStatus.textContent = "Select a numbered stop to see the details.";
  renderList();
  searchInput.focus();
});

document.querySelector("#fit-map").addEventListener("click", () => {
  if (map && allBounds.length) map.fitBounds(allBounds, { padding: [30, 30], maxZoom: 13 });
});

renderList();
initializeMap();

window.addEventListener("resize", () => {
  if (map) map.invalidateSize({ pan: false });
});
