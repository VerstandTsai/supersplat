import { Container, NumericInput } from '@playcanvas/pcui';

import { SelectOp } from '../edit-ops';
import { Events } from '../events';
import { Splat } from '../splat';

type Point = { x: number, y: number, z: number };
type Box = { start: Point, end: Point };

class FilterTool {
    activate: () => void;
    deactivate: () => void;

    constructor(events: Events, parent: HTMLElement, canvasContainer: Container) {
        // create svg
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('tool-svg', 'hidden');
        svg.id = 'filter-tool-svg';
        parent.appendChild(svg);

        let opacityThreshold = 0.2;
        let densityThreshold = 0.2;

        // ui
        const selectToolbar = new Container({
            class: 'select-toolbar',
            hidden: true
        });

        const opacityInput = new NumericInput({
            value: opacityThreshold,
            placeholder: 'Opacity threshold',
            width: 180,
            precision: 3,
            min: 0,
            max: 1
        });

        const densityInput = new NumericInput({
            value: densityThreshold,
            placeholder: 'Density threshold',
            width: 180,
            precision: 3,
            min: 0,
            max: 1
        });

        selectToolbar.append(opacityInput);
        selectToolbar.append(densityInput);
        canvasContainer.append(selectToolbar);

        const arrayMinMax = (arr: Array<number>) => {
            const min = arr.reduce((p, v) => (p < v ? p : v));
            const max = arr.reduce((p, v) => (p > v ? p : v));
            return [min, max];
        };

        const getBoundingBox = (splat: Splat) => {
            const splatData = splat.splatData;
            const xs = splatData.getProp('x');
            const ys = splatData.getProp('y');
            const zs = splatData.getProp('z');
            const [minX, maxX] = arrayMinMax(xs as unknown as Array<number>);
            const [minY, maxY] = arrayMinMax(ys as unknown as Array<number>);
            const [minZ, maxZ] = arrayMinMax(zs as unknown as Array<number>);
            return {
                start: { x: minX, y: minY, z: minZ },
                end: { x: maxX, y: maxY, z: maxZ }
            };
        };

        const getBin = (x: number, min: number, max: number, n: number) => {
            return x === max ? n - 1 : Math.floor((x - min) / (max - min) * n);
        };

        const getBin3 = (splat: Splat, i: number, boundingBox: Box, n: number) => {
            const splatData = splat.splatData;
            const xs = splatData.getProp('x');
            const ys = splatData.getProp('y');
            const zs = splatData.getProp('z');
            const ix = getBin(xs[i], boundingBox.start.x, boundingBox.end.x, n);
            const iy = getBin(ys[i], boundingBox.start.y, boundingBox.end.y, n);
            const iz = getBin(zs[i], boundingBox.start.z, boundingBox.end.z, n);
            return [ix, iy, iz];
        };

        const getDensities = (splat: Splat, boundingBox: Box, n: number) => {
            const densities = Array.from(Array(n), () => Array.from(Array(n), () => new Array(n).fill(0)));
            for (let i = 0; i < splat.numSplats; i++) {
                const [ix, iy, iz] = getBin3(splat, i, boundingBox, n);
                densities[ix][iy][iz]++;
            }
            return densities;
        };

        const getMaxDensity = (densities: Array<Array<Array<number>>>, n: number) => {
            let max = -Infinity;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    for (let k = 0; k < n; k++) {
                        max = Math.max(max, densities[i][j][k]);
                    }
                }
            }
            return max;
        };

        const apply = () => {
            const splat = events.invoke('selection') as Splat;
            const splatData = splat.splatData;
            const opacities = splatData.getProp('opacity');
            const boundingBox = getBoundingBox(splat);
            const n = 64;
            const densities = getDensities(splat, boundingBox, n);
            const maxDensity = getMaxDensity(densities, n);
            const filter = (i: number) => {
                const opacity = 1 / (1 + Math.exp(-opacities[i]));
                const [ix, iy, iz] = getBin3(splat, i, boundingBox, n);
                return opacity < opacityThreshold || densities[ix][iy][iz] / maxDensity < densityThreshold;
            };
            events.fire('edit.add', new SelectOp(splat, 'set', filter));
        };

        opacityInput.on('change', () => {
            opacityThreshold = opacityInput.value;
            apply();
        });

        densityInput.on('change', () => {
            densityThreshold = densityInput.value;
            apply();
        });

        this.activate = () => {
            parent.style.display = 'block';
            selectToolbar.hidden = false;
        };

        this.deactivate = () => {
            parent.style.display = 'none';
            selectToolbar.hidden = true;
        };
    }

    destroy() {

    }
}

export { FilterTool };
