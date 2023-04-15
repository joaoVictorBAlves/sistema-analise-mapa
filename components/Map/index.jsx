import { useEffect, useRef, useState } from "react";
import Style from "./Map.module.css"
import "leaflet/dist/leaflet.css";
import "leaflet-pixi-overlay";
import * as d3 from "d3"
import "pixi.js";

const Map = ({ data, coordinates = [0, 0], zoom = 10, minzoom = 0, maxZoom = 20, variable, scaleMethod, scaleColor = [0x96C7FF, 0x3693FF, 0x564BF, 0x063973], agrouped }) => {
    const mapRef = useRef();
    let type = data.typeMap;
    let palete = [];
    let properties = [];
    let mapScale = null;
    const set = [];
    let map;
    // SCALES AND PALETE
    useEffect(() => {
        data.features.forEach((feauture) => {
            properties = feauture.properties[variable];
            if (type === "polygons") {
                if (agrouped === "sum") {
                    properties = d3.sum(properties);
                } else if (agrouped === "mean") {
                    properties = d3.mean(properties);
                } else if (agrouped === "count") {
                    properties = properties.length;
                }
            }
            set.push(properties);
        });
        if (type === "polygons") {
            if (scaleColor === "Sequencial") {
                scaleColor = [0x96C7FF, 0x3693FF, 0x564BF, 0x063973];
                palete = ['#96C7FF', '#3693FF', '#0564BF', '#063973'];
            } else if (scaleColor === "Divergente") {
                scaleColor = [0xF73946, 0xFF6E77, 0x3693FF, 0x1564BF];
                palete = ['#F73946', '#FF6E77', '#3693FF', '#1564BF'];
            }
        }
        if (type === "markers") {
            if (scaleColor === "Sequencial") {
                scaleColor = ["baixo", "medioBaixo", "medioAlto", "alto"];
                palete = ['#96c7ff', '#3693ff', '#0564bf', '#063973'];
            } else if (scaleColor === "Divergente") {
                scaleColor = ["vermelho", "vermelhoMedio", "azul-medio", "azul"];
                palete = ['#f73946', '#ff6e77', '#3693ff', '#1564bf'];
            }
        }
        if (scaleMethod === "quantile")
            mapScale = d3.scaleQuantile()
                .domain(set.sort((a, b) => a - b))
                .range(scaleColor);
        else
            mapScale = d3.scaleQuantize()
                .domain([d3.min(set.sort((a, b) => a - b)), d3.max(set.sort((a, b) => a - b))])
                .range(scaleColor);
    }, [variable, scaleMethod, scaleColor]);
    // CREATE MAP
    useEffect(() => {
        if (type === "markers")
            zoom = 15
        if (mapRef.current) {
            if (!map)
                map = L.map(mapRef.current).setView(coordinates, zoom);
            L.tileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
                subdomains: 'abcd',
                attribution: '',
                minZoom: minzoom,
                maxZoom: maxZoom
            }).addTo(map);
        }
    }, [mapRef, data]);
    // CREATE OVERLAYERS
    useEffect(() => {
        if (type === "polygons") {
            const polygonOverlay = (() => {
                let firstDraw = true;
                let prevZoom;
                // LISTAGEM DOS POLÍGONOS
                const polygonsByGeojson = [];
                const polygonFeautures = [];
                // INSTANCIANDO OS POLÍGONOS
                data.features.forEach((feauture, i) => {
                    feauture.geometry.coordinates.forEach(polygon => {
                        polygonFeautures.push({
                            type: "Feauture",
                            properties: feauture.properties,
                            geometry: {
                                type: feauture.geometry.type,
                                coordinates: polygon
                            }
                        });
                        polygonsByGeojson.push(new PIXI.Graphics());
                    });
                });
                // ADICIONANDO GRÁFICOS NO PIXI CONTAINER
                const pixiContainer = new PIXI.Container();
                polygonsByGeojson.forEach((geo) => { geo.interactive = true });
                pixiContainer.addChild(...polygonsByGeojson);
                pixiContainer.interactive = true;
                pixiContainer.buttonMode = true;
                // CRIAÇÃO DA CAMADA
                return L.pixiOverlay((utils) => {
                    let zoom = utils.getMap().getZoom();
                    let container = utils.getContainer();
                    let renderer = utils.getRenderer();
                    let project = utils.latLngToLayerPoint;
                    let scale = utils.getScale();
                    // DESENHOS DOS POLÍGONOS
                    if (firstDraw || prevZoom !== zoom) {
                        polygonsByGeojson.forEach((polygon, i) => {
                            // DEFINIÇÃO DE CORES PARA POLÍGONOS
                            let valor = polygonFeautures[i].properties[variable];
                            if (agrouped === "sum") {
                                valor = d3.sum(valor);
                            } else if (agrouped === "mean") {
                                valor = d3.mean(valor);
                            } else if (agrouped === "count") {
                                valor = valor.length;
                            }
                            const color = variable ? mapScale(valor) : scaleColor[0];
                            const alpha = 1;
                            // PIXI.JS
                            polygon.clear()
                            polygon.lineStyle(1 / scale, 0x000000, 1);
                            polygon.beginFill(color, alpha);
                            polygonFeautures[i].geometry.coordinates.forEach((coords, index) => {
                                if (polygonFeautures[i].geometry.type === "Polygon") {
                                    const point = project([coords[1], coords[0]]) // NA PRODUÇÃO INVERTER A ORDEM
                                    if (index == 0) polygon.moveTo(point.x, point.y);
                                    else polygon.lineTo(point.x, point.y);
                                } else {
                                    coords.forEach((coord, index) => {
                                        const point = project([coord[1], coord[0]]) // NA PRODUÇÃO INVERTER A ORDEM
                                        if (index == 0) polygon.moveTo(point.x, point.y);
                                        else polygon.lineTo(point.x, point.y);
                                    });
                                }
                            })
                            polygon.endFill();
                        });
                    }
                    // CLOSE SETTINGS
                    firstDraw = false;
                    prevZoom = zoom;
                    renderer.render(container);
                }, pixiContainer);
            })();
            polygonOverlay.addTo(map);
            let center = polygonOverlay._center;
            map.setView([center.lat, center.lng], zoom);
        }
        if (type === "markers") {
            const loader = new PIXI.loaders.Loader();
            // ADICIONANDO TEXTURAS PARA MARCADORES
            loader.add('marker', 'assets/azul.png');
            loader.add('baixo', 'assets/baixo.png');
            loader.add('medioBaixo', 'assets/medio-baixo.png');
            loader.add('medioAlto', 'assets/medio-alto.png');
            loader.add('alto', 'assets/alto.png');
            loader.add('vermelho', 'assets/vermelho.png');
            loader.add('vermelhoMedio', 'assets/vermelho-medio.png');
            loader.add('azulMedio', 'assets/azul-medio.png');
            loader.add('azul', 'assets/azul.png');
            loader.load((loader, resources) => {
                const markerTexture = {
                    marker: resources.marker.texture,
                    baixo: resources.baixo.texture,
                    medioBaixo: resources.medioBaixo.texture,
                    medioAlto: resources.medioAlto.texture,
                    alto: resources.alto.texture,
                    vermelho: resources.vermelho.texture,
                    vermelhoMedio: resources.vermelhoMedio.texture,
                    azulMedio: resources.azulMedio.texture,
                    azul: resources.azul.texture
                }
                // SOBREPOSIÇÃO DE GRÁFICOS
                const markerOverlay = (() => {
                    let frame = null;
                    let firstDraw = true;
                    let prevZoom;
                    const markers = [];
                    // INSTANCIAÇÃO DO MARCADORES
                    data.features.forEach((marker) => {
                        // ESCALA DOS MARCADORES
                        const valor = marker.properties[variable];
                        const texture = variable ? markerTexture[mapScale(valor)] : markerTexture.marker;
                        // CRIAM E ADICIONAM O PIXI SPRITE NA LISTA DE MARCADORES COM AS COORDENADAS
                        const pixiMarker = new PIXI.Sprite(texture);
                        pixiMarker.popup = L.popup()
                            .setLatLng([marker.geometry.coordinates[0], marker.geometry.coordinates[1]])
                            .setContent(variable + ": " + `<strong>${marker.properties[variable]}</strong>`);
                        markers.push(pixiMarker);
                    });
                    // ADICIONANDO GRÁFICOS NO PIXI CONTAINER
                    const pixiContainer = new PIXI.Container();
                    markers.forEach((geo) => { geo.interactive = true });
                    pixiContainer.addChild(...markers);
                    pixiContainer.interactive = true;
                    pixiContainer.buttonMode = true;
                    // DESENHOS DOS GRÁFICOS GERADOS
                    return L.pixiOverlay((utils) => {
                        if (frame) {
                            cancelAnimationFrame(frame);
                            frame = null;
                        }
                        // UTILITÁRIOS
                        let zoom = utils.getMap().getZoom();
                        let container = utils.getContainer();
                        let renderer = utils.getRenderer();
                        let project = utils.latLngToLayerPoint;
                        let scale = utils.getScale();
                        // QUANDO É O PRIMEIRO DESENHO
                        if (firstDraw) {
                            // INTERAÇÃO DE CLIQUE
                            utils.getMap().on('click', (e) => {
                                // DEFINIÇÕES DE CLIQUE
                                let interaction = utils.getRenderer().plugins.interaction;
                                let pointerEvent = e.originalEvent;
                                let pixiPoint = new PIXI.Point();
                                interaction.mapPositionToPoint(pixiPoint, pointerEvent.clientX, pointerEvent.clientY);
                                let target = interaction.hitTest(pixiPoint, container);
                                if (target && target.popup) {
                                    target.popup.openOn(map);
                                }
                            });
                            // DESENHO DOS MARCADORES 
                            data.features.forEach((marker, index) => {
                                let markerCoord = project([marker.geometry.coordinates[0], marker.geometry.coordinates[1]]);
                                markers[index].x = markerCoord.x;
                                markers[index].y = markerCoord.y;
                                markers[index].anchor.set(0.5, 1);
                                markers[index].scale.set(0.09 / scale);
                                markers[index].currentScale = 0.09 / scale;
                            });
                        }
                        // ATUALIZAÇÕES DE GRÁFICOS COM O ZOOM
                        if (firstDraw || prevZoom !== zoom) {
                            // ATUALIZAÇÃO DE MARCADORES
                            markers.forEach((marker) => {
                                marker.currentScale = marker.scale.x;
                                marker.targetScale = 0.1 / scale;
                            });
                        }
                        // ANIMAÇÃO DO MARCADOR
                        const duration = 100;
                        let start;
                        const animate = (timestamp) => {
                            let progress;
                            if (start === null) start = timestamp;
                            progress = timestamp - start;
                            let lambda = progress / duration;
                            if (lambda > 1) lambda = 1;
                            lambda = lambda * (0.4 + lambda * (2.2 + lambda * -1.6));
                            markers.forEach((marker) => {
                                marker.scale.set(marker.currentScale + lambda * (marker.targetScale - marker.currentScale));
                            });
                            renderer.render(container);
                            if (progress < duration) {
                                frame = requestAnimationFrame(animate);
                            }
                        }
                        // OUTRAS CONFIGURAÇÕES
                        if (!firstDraw && prevZoom !== zoom) {
                            start = null;
                            frame = requestAnimationFrame(animate);
                        }
                        firstDraw = false;
                        prevZoom = zoom;
                        renderer.render(container);
                    }, pixiContainer);
                })();
                markerOverlay.addTo(map);
                let center = markerOverlay._center;
                map.setView([center.lat, center.lng], zoom);
            });
        }
    }, [data, variable, scaleMethod, agrouped, scaleColor])

    return (
        <div ref={mapRef} id="map-container" className={Style.Map}>
        </div>
    );
}

export default Map;