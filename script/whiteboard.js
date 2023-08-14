class Whiteboard {
	constructor(name, canvas, transport, drawable = true) {
		this.name = name || "Whiteboard";
		this.canvas = canvas;
		this.context = canvas.getContext("2d");
		this.transport = transport;

		this.coordinates = {
			x: 0,
			y: 0,
			width: canvas.width,
			height: canvas.height,
		};
		this.isDrawing = false;
		this.startX = 0;
		this.startY = 0;
		this.canvasOffsetX = this.canvas.getBoundingClientRect().left;
		this.canvasOffsetY = this.canvas.getBoundingClientRect().top;
		this.lineWidth = 2;
		this.strokeColor = "#11FF00";
		this.context.strokeStyle = this.strokeColor;

		if (drawable) {
			this.canvas.addEventListener("mousemove", this.draw.bind(this));
			this.canvas.addEventListener("mousedown", this.onDown.bind(this));
			this.canvas.addEventListener("mouseup", this.onUpOrOut.bind(this));
			this.canvas.addEventListener("mouseout", this.onUpOrOut.bind(this));
		}
	}

	notify(type, data) {
		if (this.transport) {
			this.transport.send(type, data);
		}
	}

	start(data) {
		const { width, height } = this.canvas;
		const { x, y, xRatio, yRatio, color, lineWidth } = data;
		const { x: xCoord, y: yCoord } = this.coordinates;
		this.startX = xRatio * width; // - (xCoord ? xCoord : 0);
		this.startY = yRatio * height; // - (yCoord ? yCoord : 0);
		this.strokeColor = color;
		this.lineWidth = lineWidth;
		this.isDrawing = true;
		console.log(this.name, "START x,y:color,linewidth", x, y, color, lineWidth);

		this.context.beginPath();
		this.context.moveTo(this.startX, this.startY);
		console.log(this.name, "START x,y:color,linewidth", x, y, color, lineWidth);
	}

	update(x, y, xRatio, yRatio) {
		const { width, height } = this.canvas;
		this.context.lineTo(xRatio * width, yRatio * height);
		this.context.strokeStyle = this.strokeColor;
		this.context.lineWidth = this.lineWidth;
		this.context.lineCap = "round";
		this.context.stroke();
	}

	stop() {
		this.isDrawing = false;
		this.context.closePath();
		console.log(this.name, "STOPPED DRAWING");
	}

	draw(e) {
		if (!this.isDrawing) {
			return;
		}

		const { width, height } = this.canvas;
		const {
			x: xCoord,
			y: yCoord,
			width: widthCoord,
			height: heightCoord,
		} = this.coordinates;
		const x = e.clientX - this.canvasOffsetX; // + window.scrollX;
		const y = e.clientY - this.canvasOffsetY; // + window.scrollY;

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

		this.notify("whiteboardDraw", {
			x: x,
			y: y,
			xRatio: x / width, // - (xCoord ? xCoord : 0),
			yRatio: y / height, // - (yCoord ? yCoord : 0),
			factor: this.factor,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		// console.log(
		// 	this.name,
		// 	"MOVE x,y:color,linewidth",
		// 	x,
		// 	y,
		// 	this.strokeColor,
		// 	this.lineWidth
		// );
	}

	clear() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.notify("whiteboardClear", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log(this.name, "CLEARED CANVAS");
	}

	onDown(e) {
		const { width, height } = this.canvas;
		this.isDrawing = true;
		this.startX = e.clientX - this.canvasOffsetX;
		this.startY = e.clientY - this.canvasOffsetY;
		this.notify("whiteboardStart", {
			x: this.startX,
			y: this.startY,
			xRatio: this.startX / width,
			yRatio: this.startY / height,
			factor: this.factor,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		// console.log(this.name, "startX, startY", this.startX, this.startY);
	}

	onUpOrOut(e) {
		this.isDrawing = false;
		this.notify("whiteboardStop", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log(this.name, "STOPPED DRAWING");
	}

	onLineWidthChange(lineWidth) {
		this.lineWidth = lineWidth;
	}

	onStrokeColorChange(strokeColor) {
		this.strokeColor = strokeColor;
	}

	onResize(coordinates) {
		const canvasParent = this.canvas.parentElement;
		if (!canvasParent) {
			return;
		}
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasOffsetX = this.canvas.getBoundingClientRect().left;
		this.canvasOffsetY = this.canvas.getBoundingClientRect().top;
		this.canvas.width = canvasParent.clientWidth;
		this.canvas.height = canvasParent.clientHeight;
		this.notify("whiteboardClear", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log(this.name, "CLEARED CANVAS");

		if (!coordinates) return;
		this.coordinates = coordinates;
		const { x, y, width, height } = this.coordinates;
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.strokeStyle = "#ff0000";
		this.context.lineWidth = this.lineWidth;
		this.context.lineCap = "round";
		this.context.beginPath();
		this.context.strokeRect(
			x + this.lineWidth,
			y + this.lineWidth,
			width - this.lineWidth * 2,
			height - this.lineWidth * 2
		);
	}
}

export default Whiteboard;
