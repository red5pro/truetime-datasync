class Whiteboard {
	constructor(name, canvas, transport) {
		this.name = name || "Whiteboard";
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

		const canvasParent = this.canvas.parentElement;
		var ro = new ResizeObserver(this.onResize.bind(this));
		canvasParent && ro.observe(canvasParent);
	}

	notify(type, data) {
		if (this.transport) {
			this.transport.send(type, data);
		}
	}

	start(data) {
		const { x, y, color, lineWidth } = data;
		this.startX = x;
		this.startY = y;
		this.strokeColor = color;
		this.lineWidth = lineWidth;
		this.isDrawing = true;
		console.log(this.name, "START x,y:color,linewidth", x, y, color, lineWidth);

		this.context.beginPath();
		this.context.moveTo(this.startX, this.startY);
		console.log(this.name, "START x,y:color,linewidth", x, y, color, lineWidth);
	}

	update(x, y) {
		this.context.lineTo(x, y);
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

		const x = e.clientX - this.canvasOffsetX + window.scrollX;
		const y = e.clientY - this.canvasOffsetY + window.scrollY;

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
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		});
		console.log(
			this.name,
			"MOVE x,y:color,linewidth",
			x,
			y,
			this.strokeColor,
			this.lineWidth
		);
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
		this.isDrawing = true;
		this.startX = e.clientX - this.canvasOffsetX;
		this.startY = e.clientY - this.canvasOffsetY;
		this.notify("whiteboardStart", {
			x: this.startX,
			y: this.startY,
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
		this.notify("whiteboardClear", {
			width: this.canvas.width,
			height: this.canvas.height,
		});
		// console.log(this.name, "CLEARED CANVAS");
	}
}

export default Whiteboard;
