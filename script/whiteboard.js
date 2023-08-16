/*
Copyright © 2015 Infrared5, Inc. All rights reserved.

The accompanying code comprising examples for use solely in conjunction with Red5 Pro (the "Example Code")
is  licensed  to  you  by  Infrared5  Inc.  in  consideration  of  your  agreement  to  the  following
license terms  and  conditions.  Access,  use,  modification,  or  redistribution  of  the  accompanying
code  constitutes your acceptance of the following license terms and conditions.

Permission is hereby granted, free of charge, to you to use the Example Code and associated documentation
files (collectively, the "Software") without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The Software shall be used solely in conjunction with Red5 Pro. Red5 Pro is licensed under a separate end
user  license  agreement  (the  "EULA"),  which  must  be  executed  with  Infrared5,  Inc.
An  example  of  the EULA can be found on our website at: https://account.red5pro.com/assets/LICENSE.txt.

The above copyright notice and this license shall be included in all copies or portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,  INCLUDING  BUT
NOT  LIMITED  TO  THE  WARRANTIES  OF  MERCHANTABILITY, FITNESS  FOR  A  PARTICULAR  PURPOSE  AND
NONINFRINGEMENT.   IN  NO  EVENT  SHALL INFRARED5, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN  AN  ACTION  OF  CONTRACT,  TORT  OR  OTHERWISE,  ARISING  FROM,  OUT  OF  OR  IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
const debounce = (func, delay) => {
	let timeoutId;
	return function (...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func.apply(this, args);
		}, delay);
	};
};

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

		this.history = [];
		this.redoHistoryDebounced = debounce(this.redoHistory.bind(this), 1000);
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
		this.history.push({ ...data, methodName: "start" });
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
		this.history.push({ x, y, xRatio, yRatio, methodName: "update" });
	}

	stop() {
		this.isDrawing = false;
		this.context.closePath();
		// console.log(this.name, "STOPPED DRAWING");
		this.history.push({ methodName: "stop" });
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

		const data = {
			x: x - xCoord,
			y: y - yCoord,
			xRatio: (x - xCoord) / widthCoord, // - (xCoord ? xCoord : 0),
			yRatio: (y - yCoord) / heightCoord, // - (yCoord ? yCoord : 0),
			coordinates: this.coordinates,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		};
		this.notify("whiteboardDraw", data);
		this.history.push({ ...data, methodName: "update" });
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
		this.history = [];
		// console.log(this.name, "CLEARED CANVAS");
	}

	redoHistory() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.history.forEach((item) => {
			if (item.methodName === "start") {
				this.start(item);
			} else if (item.methodName === "update") {
				this.update(item.x, item.y, item.xRatio, item.yRatio);
			} else if (item.methodName === "stop") {
				this.stop();
			}
		});
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
		const data = {
			x: this.startX - xCoord,
			y: this.startY - yCoord,
			xRatio: (this.startX - xCoord) / widthCoord,
			yRatio: (this.startY - yCoord) / heightCoord,
			coordinates: this.coordinates,
			color: this.strokeColor,
			lineWidth: this.lineWidth,
		};
		this.notify("whiteboardStart", data);
		this.history.push({ ...data, methodName: "start" });
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
		this.history.push({ methodName: "stop" });
	}

	onLineWidthChange(lineWidth) {
		this.lineWidth = lineWidth;
		this.notify("whiteboardChange", { lineWidth, color: this.strokeColor });
	}

	onStrokeColorChange(strokeColor) {
		this.strokeColor = strokeColor;
		this.notify("whiteboardChange", {
			lineWidth: this.lineWidth,
			color: strokeColor,
		});
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

		this.redoHistoryDebounced();
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
