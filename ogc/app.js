// =========================
// CONFIG
// =========================

const WMS_URL =
    "https://ahocevar.com/geoserver/wms";

const WFS_URL =
    "https://ahocevar.com/geoserver/wfs";

const LAYER_NAME =
    "topp:states";

// =========================
// REQUEST LOG
// =========================

const logEntriesEl =
document.getElementById(
    "request-log-entries"
);

function logRequest(kind, url) {

    const entry =
    document.createElement("div");

    entry.className = "entry";

    entry.innerHTML =
    `
    <span class="label ${kind}">
        ${kind.toUpperCase()}
    </span>

    ${shortenUrl(url)}
    `;

    logEntriesEl.prepend(entry);
}

function shortenUrl(url) {

    if (url.length < 150)
        return url;

    return (
        url.substring(0,140)
        + "..."
    );
}

// =========================
// BASEMAP
// =========================

const baseLayer =
new ol.layer.Tile({

    source:
    new ol.source.OSM()
});

// =========================
// WMS
// =========================

const wmsSource =
new ol.source.TileWMS({

    url: WMS_URL,

    params: {

        LAYERS:
        LAYER_NAME,

        TILED: true,
    },

    serverType:
    "geoserver",

    crossOrigin:
    "anonymous",
});

const wmsLayer =
new ol.layer.Tile({

    source:
    wmsSource,

    opacity: 0.5,
});

wmsSource.on(
    "tileloadstart",

    function(e) {

        logRequest(
            "wms",

            e.tile.src_ ||
            "WMS Request"
        );
    }
);

// =========================
// WFS
// =========================

const wfsSource =
new ol.source.Vector({

    format:
    new ol.format.GeoJSON(),

    url: function(extent) {

        const url =

        `${WFS_URL}?service=WFS` +

        `&version=1.1.0` +

        `&request=GetFeature` +

        `&typename=${LAYER_NAME}` +

        `&outputFormat=application/json` +

        `&srsname=EPSG:3857` +

        `&bbox=${extent.join(",")},EPSG:3857`;

        logRequest(
            "wfs",
            url
        );

        return url;
    },

    strategy:
    ol.loadingstrategy.bbox,
});

const wfsLayer =
new ol.layer.Vector({

    source:
    wfsSource,

    style:
    new ol.style.Style({

        stroke:
        new ol.style.Stroke({

            color: "red",

            width: 0.4,
        }),

        fill:
        new ol.style.Fill({

            color:
            "rgba(255,0,0,0.08)",
        }),
    }),
});

// =========================
// MAP
// =========================

const map =
new ol.Map({

    target: "map",

    layers: [

        baseLayer,

        wmsLayer,

        wfsLayer
    ],

    view:
    new ol.View({

        center:
        ol.proj.fromLonLat(
            [-98.5,39.5]
        ),

        zoom: 4,
    }),
});

// =========================
// POPUP
// =========================

const popupEl =
document.createElement(
    "div"
);

popupEl.className =
"ol-popup";

popupEl.style.display =
"none";

document.body.appendChild(
popupEl
);

const overlay =
new ol.Overlay({

    element:
    popupEl,

    positioning:
    "bottom-center",

    stopEvent: false,
});

map.addOverlay(overlay);

function showPopup(coord, html) {

    popupEl.innerHTML =
    html;

    popupEl.style.display =
    "block";

    overlay.setPosition(
        coord
    );
}

function hidePopup() {

    popupEl.style.display =
    "none";

    overlay.setPosition(
        undefined
    );
}

function propsTable(props) {

    return `

    <table>

        ${Object.entries(props)

        .slice(0,10)

        .map(([k,v]) => `

        <tr>
            <td>${k}</td>
            <td>${v}</td>
        </tr>

        `)

        .join("")}

    </table>
    `;
}

// =========================
// CLICK MAP
// =========================

map.on(
"click",

function(e) {

    hidePopup();

    const feature =

    map.forEachFeatureAtPixel(

        e.pixel,

        function(f) {

            return f;
        }
    );

    if (feature) {

        const props =
        feature.getProperties();

        showPopup(

        e.coordinate,

        `
        <span class="src-tag wfs">
            WFS
        </span>

        <b>Feature WFS</b>

        ${propsTable(props)}
        `
        );

        return;
    }

    const viewResolution =

    map.getView()
    .getResolution();

    const url =

    wmsSource.getFeatureInfoUrl(

        e.coordinate,

        viewResolution,

        "EPSG:3857",

        {
            INFO_FORMAT:
            "application/json",
        }
    );

    if (!url) return;

    logRequest(
        "gfi",
        url
    );

    fetch(url)

    .then(r => r.json())

    .then(data => {

        if (

            !data.features ||

            data.features.length === 0

        ) return;

        const props =

        data.features[0]
        .properties;

        showPopup(

        e.coordinate,

        `
        <span class="src-tag wms">
            WMS
        </span>

        <b>GetFeatureInfo</b>

        ${propsTable(props)}
        `
        );
    });
});

// =========================
// TOGGLE WMS
// =========================

document

.getElementById(
"toggle-wms"
)

.addEventListener(

"change",

function(e) {

    wmsLayer.setVisible(

    e.target.checked
    );
}
);

// =========================
// TOGGLE WFS
// =========================

document

.getElementById(
"toggle-wfs"
)

.addEventListener(

"change",

function(e) {

    wfsLayer.setVisible(

    e.target.checked
    );
}
);

// =========================
// BASEMAP SWITCHER
// =========================

document

.querySelectorAll(

'input[name="basemap"]'
)

.forEach((radio) => {

radio.addEventListener(

"change",

function(e) {

    if (

    e.target.value
    === "osm"

    ) {

    baseLayer.setVisible(
        true
    );

    } else {

    baseLayer.setVisible(
        false
    );
    }
}
);
});

// =========================
// ZOOM TO WFS
// =========================

document

.getElementById(
"btn-wfs-extent"
)

.addEventListener(

"click",

function() {

    map.getView().fit(

    wfsSource.getExtent(),

    {

        duration: 1000,

        padding:
        [40,40,40,40]
    }
    );
}
);