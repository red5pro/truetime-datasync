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
		const {
			x: xCoord,
			y: yCoord,
			width: widthCoord,
			height: heightCoord,
		} = this.coordinates;
		const { x, y, xRatio, yRatio, color, lineWidth } = data;
		this.startX = xCoord + xRatio * widthCoord;
		this.startY = yCoord + yRatio * heightCoord;

		this.strokeColor = color;
		this.lineWidth = lineWidth;
		this.context.strokeStyle = this.strokeColor;
		this.context.lineWidth = this.lineWidth;

		this.context.beginPath();
		this.context.moveTo(this.startX, this.startY);
		this.isDrawing = true;
	}

	update(x, y, xRatio, yRatio) {
		const {
			x: xCoord,
			y: yCoord,
			width: widthCoord,
			height: heightCoord,
		} = this.coordinates;
		this.context.lineTo(
			xCoord + xRatio * widthCoord,
			yCoord + yRatio * heightCoord
		);
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
		const x = e.clientX - this.canvasOffsetX + window.scrollX;
		const y = e.clientY - this.canvasOffsetY + window.scrollY;

		this.context.strokeStyle = this.strokeColor;
		this.context.lineWidth = this.lineWidth;
		this.context.lineCap = "round";
		this.context.beginPath();
		this.context.moveTo(this.startX, this.startY);
		this.context.lineTo(x, y);
		this.context.stroke();
		this.context.closePath();
		this.startX = x;
		this.startY = y;

		this.notify("whiteboardDraw", {
			x: x - xCoord,
			y: y - yCoord,
			xRatio: (x - xCoord) / widthCoord, // - (xCoord ? xCoord : 0),
			yRatio: (y - yCoord) / heightCoord, // - (yCoord ? yCoord : 0),
			coordinates: this.coordinates,
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
		this.startX = e.clientX - this.canvasOffsetX + window.scrollX;
		this.startY = e.clientY - this.canvasOffsetY + window.scrollY;
		const {
			x: xCoord,
			y: yCoord,
			width: widthCoord,
			height: heightCoord,
		} = this.coordinates;
		this.notify("whiteboardStart", {
			x: this.startX - xCoord,
			y: this.startY - yCoord,
			xRatio: (this.startX - xCoord) / widthCoord,
			yRatio: (this.startY - yCoord) / heightCoord,
			coordinates: this.coordinates,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		// console.log(this.name, "startX, startY", this.startX, this.startY);
	}

	onUpOrOut(e) {
		if (this.isDrawing) {
			this.isDrawing = false;
			this.notify("whiteboardStop", {
				width: this.canvas.width,
				height: this.canvas.height,
			});
			// console.log(this.name, "STOPPED DRAWING");
		}
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

		// Draw border box of visible video area.
		/*
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
    */
	}
}

export default Whiteboard;
