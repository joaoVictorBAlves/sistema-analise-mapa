import "leaflet-pixi-overlay";
import { geoBounds } from 'd3-geo';
let scaledCoordinates;
import "pixi.js";

const useMarkersOverlay = (map, data, variable, mapScale) => {
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
                if (variable)
                    pixiMarker.popup = L.popup()
                        .setLatLng([marker.geometry.coordinates[0] + 0.0005, marker.geometry.coordinates[1]])
                        .setContent(variable + ": " + `<strong>${marker.properties[variable]}</strong>`)
                markers.push(pixiMarker);
            });
            scaledCoordinates = data.features.map((marker) => marker.geometry.coordinates);
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

        const markerGroup = L.featureGroup();
        scaledCoordinates.forEach(coord => {
            L.marker(coord).addTo(markerGroup);
        });
        const bounds = markerGroup.getBounds();
        map.fitBounds(bounds);
    });
}

export default useMarkersOverlay;