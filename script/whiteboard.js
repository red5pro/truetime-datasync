class Whiteboard {
	constructor(canvas, transport) {
		this.canvas = canvas;
		this.context = canvas.getContext("2d");
		this.transport = transport;

		this.isDrawing = false;
		this.startX = 0;
		this.startY = 0;
		this.canvasOffsetX = this.canvas.getBoundingClientRect().left;
		this.canvasOffsetY = this.canvas.getBoundingClientRect().top;
		this.lineWidth = 2;
		this.strokeColor = "#11FF00";
		this.context.strokeStyle = this.strokeColor;

		this.canvas.addEventListener("mousemove", this.draw.bind(this));
		this.canvas.addEventListener("mousedown", this.onDown.bind(this));
		this.canvas.addEventListener("mouseup", this.onUpOrOut.bind(this));
		this.canvas.addEventListener("mouseout", this.onUpOrOut.bind(this));
		this.onResize();
	}

	draw(e) {
		if (!this.isDrawing) {
			return;
		}

		const x = e.clientX - this.canvasOffsetX;
		const y = e.clientY - this.canvasOffsetY;

		this.context.beginPath();
		this.context.moveTo(this.startX, this.startY);
		this.context.lineTo(x, y);
		this.context.strokeStyle = this.strokeColor;
		this.context.lineWidth = this.lineWidth;
		this.context.lineCap = "round";
		this.context.stroke();
		this.context.closePath();
		this.startX = x;
		this.startY = y;

		this.transport.send("whiteboardDraw", {
			x: x,
			y: y,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		// console.log(
		// 	"MOVE x,y:color,linewidth",
		// 	x,
		// 	y,
		// 	this.strokeColor,
		// 	this.lineWidth
		// );
	}

	clear() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.transport.send("whiteboardClear", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log("CLEARED CANVAS");
	}

	onDown(e) {
		this.isDrawing = true;
		this.startX = e.clientX - this.canvasOffsetX;
		this.startY = e.clientY - this.canvasOffsetY;
		this.transport.send("whiteboardStart", {
			x: this.startX,
			y: this.startY,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		// console.log("startX, startY", this.startX, this.startY);
	}

	onUpOrOut(e) {
		this.isDrawing = false;
		this.transport.send("whiteboardStop", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log("STOPPED DRAWING");
	}

	onLineWidthChange(lineWidth) {
		this.lineWidth = lineWidth;
	}

	onStrokeColorChange(strokeColor) {
		this.strokeColor = strokeColor;
	}

	onResize() {
		const canvasParent = this.canvas.parentElement;
		if (!canvasParent) {
			return;
		}
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasOffsetX = this.canvas.getBoundingClientRect().left;
		this.canvasOffsetY = this.canvas.getBoundingClientRect().top;
		this.canvas.width = canvasParent.clientWidth;
		this.canvas.height = canvasParent.clientHeight;
		this.transport.send("whiteboardClear", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log("CLEARED CANVAS");
	}
}

export default Whiteboard;
