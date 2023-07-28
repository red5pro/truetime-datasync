const strokeColorInput = document.querySelector("#stroke-color-input");
const lineWidthInput = document.querySelector("#line-width-input");
const clearButton = document.querySelector("#clear-button");

const canvas = document.querySelector("#whiteboard");
const canvasParent = canvas.parentElement;
const context = canvas.getContext("2d");

let isDrawing = false;
let startX = 0;
let startY = 0;
let lineWidth = 2;
let strokeColor = "#FFFFFF";
let canvasOffsetX = canvas.getBoundingClientRect().left;
let canvasOffsetY = canvas.getBoundingClientRect().top;
strokeColorInput.value = strokeColor;
lineWidthInput.value = lineWidth;
context.strokeStyle = strokeColor;

const draw = (e) => {
	if (!isDrawing) {
		return;
	}

	const x = e.clientX - canvasOffsetX;
	const y = e.clientY - canvasOffsetY;

	context.beginPath();
	context.moveTo(startX, startY);
	context.lineTo(x, y);
	context.strokeStyle = strokeColor;
	context.lineWidth = lineWidth;
	context.lineCap = "round";
	context.stroke();
	context.closePath();
	startX = x;
	startY = y;
};

strokeColorInput.addEventListener("change", (e) => {
	strokeColor = e.target.value;
	// context.strokeStyle = strokeColor;
});

lineWidthInput.addEventListener("change", (e) => {
	lineWidth = parseInt(e.target.value, 10);
});

canvas.addEventListener("mousedown", (e) => {
	isDrawing = true;
	startX = e.clientX - canvasOffsetX;
	startY = e.clientY - canvasOffsetY;
});

canvas.addEventListener("mouseup", (e) => {
	isDrawing = false;
});
canvas.addEventListener("mouseout", (e) => {
	isDrawing = false;
});

canvas.addEventListener("mousemove", draw);

const handleWindowResize = () => {
	context.clearRect(0, 0, canvas.width, canvas.height);
	canvasOffsetX = canvas.getBoundingClientRect().left;
	canvasOffsetY = canvas.getBoundingClientRect().top;
	canvas.width = canvasParent.clientWidth;
	canvas.height = canvasParent.clientHeight;
};
window.addEventListener("resize", handleWindowResize);
document.addEventListener("DOMContentLoaded", handleWindowResize);
handleWindowResize();
