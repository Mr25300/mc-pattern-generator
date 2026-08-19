import { createNoise2D, NoiseFunction2D } from "simplex-noise"
import alea from "alea";

class NormalNoise {
    private noise2D: NoiseFunction2D;
    private offsetX: number;
    private offsetY: number;

    constructor() {
        this.reseed();
    }

    public get(posX: number, posY: number): number {
        const noise: number = this.noise2D(posX + this.offsetX, posY + this.offsetY);
        const normalized = (noise + 1) * 0.5;

        return Math.min(Math.max(normalized, 0), 1);
    }

    public reseed(): void {
        const seed = Math.random().toString();

        this.noise2D = createNoise2D(alea(seed));
        this.offsetX = Math.random() * 1000;
        this.offsetY = Math.random() * 1000;
    }
}

interface BlockInfo {
    colour: string;
    weight: number;
}

class PatternGrid {
    private noiseFunc: NormalNoise;
    private dimensions: [number, number];
    private scale: [number, number];
    private blocks: BlockInfo[];
    private weightSum: number = 0;

    constructor(
        noiseFunc: NormalNoise,
        dimensions: [number, number],
        frequency: [number, number],
        blocks: BlockInfo[]
    ) {
        this.noiseFunc = noiseFunc;
        this.dimensions = dimensions;
        this.scale = [Math.exp(frequency[0]), Math.exp(frequency[1])];
        this.blocks = blocks;

        for (const info of blocks.values()) {
            this.weightSum += info.weight;
        }
    }

    public getBlockAt(pos: [number, number]): BlockInfo {
        let noise: number = this.noiseFunc.get(
            (pos[0] - this.dimensions[0] * 0.5) * this.scale[0],
            (pos[1] - this.dimensions[1] * 0.5) * this.scale[1]
        );

        for (const info of this.blocks.values()) {
            noise -= info.weight / this.weightSum;

            if (noise <= 0) return info;
        }

        return Array.from(this.blocks.values())[0];
    }
}

const noiseFunc: NormalNoise = new NormalNoise();

const colsRange: HTMLInputElement = document.getElementById("cols-input") as HTMLInputElement;
const rowsRange: HTMLInputElement = document.getElementById("rows-input") as HTMLInputElement;
const xFreqRange: HTMLInputElement = document.getElementById("x-freq-range") as HTMLInputElement;
const yFreqRange: HTMLInputElement = document.getElementById("y-freq-range") as HTMLInputElement;
const regenBtn: HTMLButtonElement = document.getElementById("regen-btn") as HTMLButtonElement;
const addBlockBtn: HTMLButtonElement = document.getElementById("add-block-btn") as HTMLButtonElement;
const delBlocksButton: HTMLButtonElement = document.getElementById("del-blocks-btn") as HTMLButtonElement;
const blockContainer: HTMLDivElement = document.getElementById("block-container") as HTMLDivElement;
const canvas: HTMLCanvasElement = document.getElementById("grid-canvas") as HTMLCanvasElement;

const blockWidth: number = 20;
const blockHeight: number = 20;

const colours: string[] = [
    "white", "grey", "black", "brown", "red", "orange", "yellow", "green", "blue", "purple", "pink"
];

const currentBlocks = new Map<HTMLDivElement, BlockInfo>();
const blockCountSpans = new Map<BlockInfo, HTMLSpanElement>();

let blockNum: number = 0;

function clearCanvas(): void {
    const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const span of blockCountSpans.values()) {
        span.innerText = "";
    }
}

function updateCanvas(): void {
    if (currentBlocks.size == 0) {
        clearCanvas();

        return;
    }

    const cols: number = Number.parseInt(colsRange.value);
    const rows: number = Number.parseInt(rowsRange.value);
    const xFreq: number = Number.parseFloat(xFreqRange.value);
    const yFreq: number = Number.parseFloat(yFreqRange.value);

    if (Number.isNaN(cols) || Number.isNaN(rows) || Number.isNaN(xFreq) || Number.isNaN(yFreq)) {
        clearCanvas();

        return;
    }

    const patternGrid = new PatternGrid(
        noiseFunc, [cols, rows], [xFreq, yFreq], Array.from(currentBlocks.values())
    );

    canvas.width = cols * blockWidth;
    canvas.height = rows * blockHeight;

    const context: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

    const countMap = new Map<BlockInfo, number>();

    for (let i: number = 0; i < cols; i++) {
        for (let j: number = 0; j < rows; j++) {
            const block = patternGrid.getBlockAt([i, j]);

            countMap.set(block, (countMap.get(block) ?? 0) + 1)

            context.strokeStyle = "black";
            context.lineWidth = 1;
            context.fillStyle = block.colour;

            context.fillRect(i * blockWidth, j * blockHeight, blockWidth, blockHeight);
            context.strokeRect(i * blockWidth, j * blockHeight, blockWidth, blockHeight);
        }
    }

    for (const [block, countSpan] of blockCountSpans.entries()) {
        const count = countMap.get(block) ?? 0; // ?? same as || but only for null or undefined

        countSpan.innerText = ` ${count} (${Math.floor(count / 64)}×64 + ${count % 64}) `;
    }
}

addBlockBtn.addEventListener("click", () => {
    const blockDiv: HTMLDivElement = document.createElement("div");

    const nameInput: HTMLInputElement = document.createElement("input");
    nameInput.placeholder = "Name";
    nameInput.value = `Block ${blockNum + 1}`;

    const colourSelect: HTMLSelectElement = document.createElement("select");

    for (const colour of colours) {
        const option: HTMLOptionElement = document.createElement("option");
        option.innerText = colour.charAt(0).toUpperCase() + colour.slice(1);
        option.value = colour;

        colourSelect.append(option);
    }

    colourSelect.value = colours[blockNum % colours.length];

    const weightInput: HTMLInputElement = document.createElement("input");
    weightInput.placeholder = "Weight";
    weightInput.value = "1";

    const countSpan: HTMLSpanElement = document.createElement("span");

    const deleteBtn: HTMLButtonElement = document.createElement("button");
    deleteBtn.innerText = "Delete";

    const updateBlock = () => {
        const colour: string = colourSelect.value;
        let weight: number = Number.parseFloat(weightInput.value);

        if (!colour || Number.isNaN(weight)) {
            clearCanvas();

            return;
        }

        const block: BlockInfo | undefined = currentBlocks.get(blockDiv);

        if (block) {
            block.colour = colour;
            block.weight = weight;

        } else {
            const newBlock = {colour: colour, weight: weight};

            currentBlocks.set(blockDiv, newBlock);
            blockCountSpans.set(newBlock, countSpan);
        }

        updateCanvas();
    }

    for (const input of [nameInput, colourSelect, weightInput]) {
        input.addEventListener("input", updateBlock);
    }

    deleteBtn.addEventListener("click", () => {
        blockDiv.remove();
        currentBlocks.delete(blockDiv);

        updateCanvas();
    });

    updateBlock();

    blockDiv.append(nameInput, colourSelect, weightInput, countSpan, deleteBtn);
    blockContainer.append(blockDiv);

    blockNum++;
});

delBlocksButton.addEventListener("click", () => {
    blockContainer.replaceChildren();
    currentBlocks.clear();

    updateCanvas();
});

regenBtn.addEventListener("click", () => {
    noiseFunc.reseed();

    updateCanvas();
});

for (const range of [rowsRange, colsRange, xFreqRange, yFreqRange]) {
    range.addEventListener("input", updateCanvas);
}

document.addEventListener("DOMContentLoaded", updateCanvas);
