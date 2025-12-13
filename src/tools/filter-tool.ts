import { Container, NumericInput } from '@playcanvas/pcui';

import { Events } from '../events';

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
        selectToolbar.append(opacityInput);
        canvasContainer.append(selectToolbar);

        const filter = () => {
            console.log("Hello, world!");
        }

        opacityInput.on('change', () => {
            opacityThreshold = opacityInput.value;
            filter();
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
