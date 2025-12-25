import { Container, NumericInput } from '@playcanvas/pcui';

import { Events } from '../events';

type Point = { x: number, y: number };
type Rectangle = { start: Point, end: Point };

class SegmentTool {
    activate: () => void;
    deactivate: () => void;

    constructor(events: Events, parent: HTMLElement, mask: { canvas: HTMLCanvasElement, context: CanvasRenderingContext2D }, canvasContainer: Container) {
        // create svg
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('tool-svg', 'hidden');
        svg.id = 'segment-tool-svg';
        parent.appendChild(svg);

        let nAngles = 1;

        // ui
        const selectToolbar = new Container({
            class: 'select-toolbar',
            hidden: true
        });

        const nAnglesInput = new NumericInput({
            value: nAngles,
            placeholder: '# of angles',
            width: 120,
            precision: 0,
            min: 1,
            max: 8
        });
        selectToolbar.append(nAnglesInput);
        canvasContainer.append(selectToolbar);

        nAnglesInput.on('change', () => {
            nAngles = nAnglesInput.value;
        });

        // create rect element
        const rect = document.createElementNS(svg.namespaceURI, 'rect') as SVGRectElement;
        svg.appendChild(rect);

        // create canvas
        const { canvas, context } = mask;

        const start = { x: 0, y: 0 };
        const end = { x: 0, y: 0 };
        let dragId: number | undefined;

        const updateRect = () => {
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(start.x - end.x);
            const height = Math.abs(start.y - end.y);

            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', width.toString());
            rect.setAttribute('height', height.toString());
        };

        const denoise = async (area: Rectangle) => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            const data = await events.invoke('render.offscreen', canvas.width, canvas.height);
            const formData = new FormData();
            formData.append('x0', area.start.x.toFixed(0));
            formData.append('y0', area.start.y.toFixed(0));
            formData.append('x1', area.end.x.toFixed(0));
            formData.append('y1', area.end.y.toFixed(0));
            formData.append('width', canvas.width.toString());
            formData.append('height', canvas.height.toString());
            formData.append('rendering', new Blob([data]), 'data.bin');
            const res = await fetch('http://localhost:5000', {
                method: 'POST',
                body: formData
            });
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const maskImage = new Uint8Array(arrayBuffer);
            const imageData = context.createImageData(canvas.width, canvas.height);
            imageData.data.set(maskImage);
            context.putImageData(imageData, 0, 0);
            events.fire('select.byMask', 'set', canvas, context);
            events.fire('select.invert');
            events.fire('select.delete');
        };

        const segment = async (area: Rectangle) => {
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
            const pose = events.invoke('camera.getPose');
            const x = pose.position.x;
            const y = pose.position.y;
            const z = pose.position.z;
            const r = Math.hypot(x, z);
            const t = Math.atan2(x, z);
            const dt = 2 * Math.PI / nAngles;
            for (let i = 0; i < nAngles; i++) {
                events.fire('camera.setPose', {
                    position: {
                        x: r * Math.sin(t + i * dt),
                        y: y,
                        z: r * Math.cos(t + i * dt)
                    },
                    target: { x: 0, y: 0, z: 0 }
                });
                await denoise(area);
            }
        };

        const pointerdown = (e: PointerEvent) => {
            if (dragId === undefined && (e.pointerType === 'mouse' ? e.button === 0 : e.isPrimary)) {
                e.preventDefault();
                e.stopPropagation();

                dragId = e.pointerId;
                parent.setPointerCapture(dragId);

                const center = { x: parent.clientWidth / 2, y: parent.clientHeight / 2 };
                start.x = 2 * center.x - e.offsetX;
                start.y = 2 * center.y - e.offsetY;
                end.x = e.offsetX;
                end.y = e.offsetY;

                updateRect();

                svg.classList.remove('hidden');
            }
        };

        const pointermove = (e: PointerEvent) => {
            if (e.pointerId === dragId) {
                e.preventDefault();
                e.stopPropagation();

                const center = { x: parent.clientWidth / 2, y: parent.clientHeight / 2 };
                start.x = 2 * center.x - e.offsetX;
                start.y = 2 * center.y - e.offsetY;
                end.x = e.offsetX;
                end.y = e.offsetY;

                updateRect();
            }
        };

        const dragEnd = () => {
            parent.releasePointerCapture(dragId);
            dragId = undefined;
            svg.classList.add('hidden');
        };

        const pointerup = (e: PointerEvent) => {
            if (e.pointerId === dragId) {
                e.preventDefault();
                e.stopPropagation();

                dragEnd();

                // rect select
                segment({
                    start: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
                    end: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) }
                });
            }
        };

        this.activate = () => {
            const pose = events.invoke('camera.getPose');
            events.fire('camera.setPose', { position: pose.position, target: { x: 0, y: 0, z: 0 } });
            events.fire('camera.setMode', 'centers');
            parent.style.display = 'block';
            parent.addEventListener('pointerdown', pointerdown);
            parent.addEventListener('pointermove', pointermove);
            parent.addEventListener('pointerup', pointerup);
            selectToolbar.hidden = false;
        };

        this.deactivate = () => {
            if (dragId !== undefined) {
                dragEnd();
            }
            parent.style.display = 'none';
            parent.removeEventListener('pointerdown', pointerdown);
            parent.removeEventListener('pointermove', pointermove);
            parent.removeEventListener('pointerup', pointerup);
            selectToolbar.hidden = true;
        };
    }

    destroy() {

    }
}

export { SegmentTool };
