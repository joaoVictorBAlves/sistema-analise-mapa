import { useEffect, useRef, useState } from "react";
import Style from "./Map.module.css"
import "leaflet/dist/leaflet.css";
import "leaflet-pixi-overlay";
import * as d3 from "d3"
import "pixi.js";
import Legend from "./Legend";
import Details from "./Details";
import useMarkersOverlay from "./hooks/useMarkersOverlay";
import usePolygonOverlay from "./hooks/usePolygonOverlay";
let map;


const Map = ({ data, minzoom = 0, maxZoom = 20, variable, scaleMethod, scaleColor = [0x96C7FF, 0x3693FF, 0x564BF, 0x063973], agrouped }) => {
    const mapRef = useRef();
    const [details, setDetails] = useState();
    const [location, setLocation] = useState();
    const [focusPolygon, setFocusPolygon] = useState();
    const [polygonLayer, setPolygonLayer] = useState();
    const [legendSet, setLegendSet] = useState([]);
    let set = [];
    let type = data.typeMap;
    let properties = [];
    let colors = null;
    let palete = null;
    let mapScale;

    // CREATE MAP
    useEffect(() => {
        if (mapRef.current) {
            if (!map)
                map = L.map(mapRef.current).setView([0, 0], 0);
            L.tileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
                subdomains: 'abcd',
                attribution: '',
                minZoom: minzoom,
                maxZoom: maxZoom
            }).addTo(map);
        }
    }, [mapRef, data]);
    // DEFINE SET OF VALUES
    useEffect(() => {
        const auxSet = [];
        data.features.forEach((feauture) => {
            properties = feauture.properties[variable];
            // DESCOBRE SE PROPERTIES É CONJUNTO DE RESPOSTAS
            if (Array.isArray(properties)) {
                // DESCOBRE SE SÃO RESPOSTAS DE MULTIPLA ESCOLHA
                if (Array.isArray(properties[0])) {
                    // ACHATA ARRAY
                    properties = [].concat(...properties);
                }
            }

            let numericProperties = properties.map(prop => {
                if (!isNaN(parseFloat(prop))) {
                    return parseFloat(prop);
                }
                return false
            });

            if (numericProperties) {
                properties = numericProperties
                if (type === "polygons") {
                    if (agrouped === "sum") {
                        properties = d3.sum(properties);
                    } else if (agrouped === "mean") {
                        properties = d3.mean(properties);
                    } else if (agrouped === "count") {
                        properties = properties.length;
                    }
                }
            }
            auxSet.push(properties);
        });
        set = auxSet;
        setLegendSet(auxSet);
    }, [data, variable, agrouped]);
    // DEFINE SCALES COLORS AND METHODS
    useEffect(() => {
        if (type === "polygons") {
            if (scaleColor === "Sequencial") {
                colors = [0x96C7FF, 0x3693FF, 0x564BF, 0x063973];
                palete = ['#96C7FF', '#3693FF', '#0564BF', '#063973'];
            } else if (scaleColor === "Divergente") {
                colors = [0xF73946, 0xFF6E77, 0x3693FF, 0x1564BF];
                palete = ['#F73946', '#FF6E77', '#3693FF', '#1564BF'];
            }
        }
        if (type === "markers") {
            if (scaleColor === "Sequencial") {
                colors = ["baixo", "medioBaixo", "medioAlto", "alto"];
                palete = ['#96c7ff', '#3693ff', '#0564bf', '#063973'];
            } else if (scaleColor === "Divergente") {
                colors = ["vermelho", "vermelhoMedio", "azul-medio", "azul"];
                palete = ['#f73946', '#ff6e77', '#3693ff', '#1564bf'];
            }
        }
        if (variable) {
            if (scaleMethod === "Quantile") {
                mapScale = d3.scaleQuantile()
                    .domain(set.sort((a, b) => a - b))
                    .range(colors);
            }
            if (scaleMethod === "Quantize") {
                mapScale = d3.scaleQuantize()
                    .domain([d3.min(set.sort((a, b) => a - b)), d3.max(set.sort((a, b) => a - b))])
                    .range(colors);
            }
        }
    }, [set, scaleColor, scaleMethod]);
    // CREATE OVERLAYERS
    useEffect(() => {
        if (type === "polygons") {
            usePolygonOverlay(map, data, variable, agrouped, mapScale, colors, setDetails, setLocation, setFocusPolygon);
        }
        if (type === "markers") {
            useMarkersOverlay(map, data, variable, mapScale);
        }
    }, [mapScale]);
    // MOUSEOVER FOCUS
    useEffect(() => {
        if (map && focusPolygon) {
            const newPolygonLayer = L.polygon(focusPolygon, {
                interactive: false,
                color: "black",
                fillOpacity: 0
            }).addTo(map);
            setPolygonLayer(newPolygonLayer);
        } else {
            setPolygonLayer(null);
        }
    }, [map, focusPolygon]);
    // UPDATE FOCUS LAYERS
    useEffect(() => {
        return () => {
            if (polygonLayer) {
                map.removeLayer(polygonLayer);
            }
        };
    }, [map, polygonLayer]);

    return (
        <div>
            <div style={{ position: 'absolute', zIndex: 0 }} ref={mapRef} id="map-container" className={Style.Map}>
            </div>
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: '1' }}>
                {variable && <Details type={type} title={variable} detail={details} place={location} agrouped={agrouped} />}
            </div>
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: '1' }}>
                {variable && <Legend key={1} type={type} variable={variable} set={legendSet} palete={palete} scaleMethod={scaleMethod} scaleColor={scaleColor} />}
            </div>
        </div>
    );
}

export default Map;