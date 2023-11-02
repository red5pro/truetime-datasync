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

/**
 * Basic debounce method.
 * @param {Function} func
 * @param {Number} delay
 * @returns
 */
const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * Textual map of message types.
 */
export const MESSAGES = {
  WHITEBOARD_START: 'whiteboardStart',
  WHITEBOARD_DRAW: 'whiteboardDraw',
  WHITEBOARD_STOP: 'whiteboardStop',
  WHITEBOARD_CLEAR: 'whiteboardClear',
  WHITEBOARD_CHANGE: 'whiteboardChange',
}

/**
 * The Whiteboard class handles sending out draw events to a transport and drawing on a canvas based on
 * 	incoming messages from the transport as well as recorded history.
 * The recorded history will be redrawn on resize of the canvas.
 * The recorded history will be cleared upon instruction.
 */
class Whiteboard {
  /**
   *
   * @param {String} name Simple string identifier to be used in logging.
   * @param {Canvas} canvas HTML Canvas element to draw on.
   * @param {Object} transport Optional transport to send draw events to.
   * @param {Boolean} drawable Flag on whether to assign event handlers on the canvas.
   */
  constructor(name, canvas, transport = undefined, drawable = true) {
    this.name = name || 'Whiteboard'
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.transport = transport

    // Default base coordinates.
    // These will be updated based on resize events.
    this.coordinates = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    }
    this.isDrawing = false
    this.startX = 0
    this.startY = 0
    this.canvasOffsetX = this.canvas.getBoundingClientRect().left
    this.canvasOffsetY = this.canvas.getBoundingClientRect().top
    this.lineWidth = 2
    this.strokeColor = '#11FF00'
    this.context.strokeStyle = this.strokeColor

    // If drawable, assign event handlers.
    if (drawable) {
      this.canvas.addEventListener('mousemove', this.draw.bind(this))
      this.canvas.addEventListener('mousedown', this.onDown.bind(this))
      this.canvas.addEventListener('mouseup', this.onUpOrOut.bind(this))
      this.canvas.addEventListener('mouseout', this.onUpOrOut.bind(this))
    }

    // Stores history of draw events.
    this.history = []
    // Debounced method to redraw history on resize.
    this.redoHistoryDebounced = debounce(this.redoHistory.bind(this), 1000)
  }

  /**
   * Sends out draw messages on transport.
   * @param {String} type
   * @param {Object} data
   */
  notify(type, data) {
    if (this.transport) {
      if (data.coordinates && typeof data.coordinates !== 'string') {
        data.coordinates = JSON.stringify(data.coordinates)
      }
      this.transport.send(type, data)
    }
  }

  /**
   * Starts a draw request.
   * @param {*} data
   */
  start(data) {
    const {
      x: xCoord,
      y: yCoord,
      width: widthCoord,
      height: heightCoord,
    } = this.coordinates
    const { x, y, xRatio, yRatio, color, lineWidth } = data
    this.startX = xCoord + xRatio * widthCoord
    this.startY = yCoord + yRatio * heightCoord

    this.strokeColor = color
    this.lineWidth = lineWidth
    this.context.strokeStyle = this.strokeColor
    this.context.lineWidth = this.lineWidth

    this.context.beginPath()
    this.context.moveTo(this.startX, this.startY)
    this.isDrawing = true
    this.history.push({ ...data, methodName: MESSAGES.WHITEBOARD_START })
  }

  /**
   * Updates a draw request.
   * @param {Number} x
   * @param {Number} y
   * @param {Number} xRatio
   * @param {Number} yRatio
   */
  update(x, y, xRatio, yRatio) {
    const {
      x: xCoord,
      y: yCoord,
      width: widthCoord,
      height: heightCoord,
    } = this.coordinates
    this.context.lineTo(
      xCoord + xRatio * widthCoord,
      yCoord + yRatio * heightCoord
    )
    this.context.stroke()
    this.history.push({
      x,
      y,
      xRatio,
      yRatio,
      methodName: MESSAGES.WHITEBOARD_DRAW,
    })
  }

  /**
   * Stops a draw request.
   */
  stop() {
    this.isDrawing = false
    this.context.closePath()
    // console.log(this.name, "STOPPED DRAWING");
    this.history.push({ methodName: MESSAGES.WHITEBOARD_STOP })
  }

  /**
   * Internal draw method based on mousemove events.
   * @param {MouseEvent} e
   */
  draw(e) {
    if (!this.isDrawing) {
      return
    }

    const { clientX, clientY } = e
    const { width, height } = this.canvas
    const {
      x: xCoord,
      y: yCoord,
      width: widthCoord,
      height: heightCoord,
    } = this.coordinates
    const x = clientX - this.canvasOffsetX + window.scrollX
    const y = clientY - this.canvasOffsetY + window.scrollY

    this.context.strokeStyle = this.strokeColor
    this.context.lineWidth = this.lineWidth
    this.context.lineCap = 'round'
    this.context.beginPath()
    this.context.moveTo(this.startX, this.startY)
    this.context.lineTo(x, y)
    this.context.stroke()
    this.context.closePath()
    this.startX = x
    this.startY = y

    const data = {
      x: x - xCoord,
      y: y - yCoord,
      xRatio: (x - xCoord) / widthCoord,
      yRatio: (y - yCoord) / heightCoord,
      coordinates: this.coordinates,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
    }
    this.notify(MESSAGES.WHITEBOARD_DRAW, data)
    this.history.push({ ...data, methodName: MESSAGES.WHITEBOARD_DRAW })
  }

  /**
   * Request to clear the canvas.
   */
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.notify(MESSAGES.WHITEBOARD_CLEAR, {
      width: this.canvas.width,
      height: this.canvas.height,
    })
    // Clear history, as well.
    this.history = []
  }

  /**
   * Request to redraw history.
   */
  redoHistory() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.history.forEach((item) => {
      if (item.methodName === MESSAGES.WHITEBOARD_START) {
        this.start(item)
      } else if (item.methodName === MESSAGES.WHITEBOARD_DRAW) {
        this.update(item.x, item.y, item.xRatio, item.yRatio)
      } else if (item.methodName === MESSAGES.WHITEBOARD_STOP) {
        this.stop()
      }
    })
  }

  /**
   * Internal method to handle mouse down events.
   * @param {MouseEvent} e
   */
  onDown(e) {
    const { width, height } = this.canvas
    this.isDrawing = true
    this.startX = e.clientX - this.canvasOffsetX + window.scrollX
    this.startY = e.clientY - this.canvasOffsetY + window.scrollY
    const {
      x: xCoord,
      y: yCoord,
      width: widthCoord,
      height: heightCoord,
    } = this.coordinates
    const data = {
      x: this.startX - xCoord,
      y: this.startY - yCoord,
      xRatio: (this.startX - xCoord) / widthCoord,
      yRatio: (this.startY - yCoord) / heightCoord,
      coordinates: this.coordinates,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
    }
    this.notify(MESSAGES.WHITEBOARD_START, data)
    this.history.push({ ...data, methodName: MESSAGES.WHITEBOARD_START })
  }

  /**
   * Internal method to handle mouse up or mouse out events.
   * @param {MouseEvent} e
   */
  onUpOrOut(e) {
    if (this.isDrawing) {
      this.isDrawing = false
      this.notify(MESSAGES.WHITEBOARD_STOP, {
        width: this.canvas.width,
        height: this.canvas.height,
      })
    }
    this.history.push({ methodName: MESSAGES.WHITEBOARD_STOP })
  }

  /**
   * Handler for change in line width.
   * @param {Number} lineWidth
   */
  onLineWidthChange(lineWidth) {
    this.lineWidth = lineWidth
    this.notify(MESSAGES.WHITEBOARD_CHANGE, {
      lineWidth,
      color: this.strokeColor,
    })
  }

  /**
   * Handler for change in stroke color.
   * @param {String} strokeColor Hex color string.
   */
  onStrokeColorChange(strokeColor) {
    this.strokeColor = strokeColor
    this.notify(MESSAGES.WHITEBOARD_CHANGE, {
      lineWidth: this.lineWidth,
      color: strokeColor,
    })
  }

  /**
   * Handler for resize events.
   * @param {Object} coordinates
   */
  onResize(coordinates) {
    const canvasParent = this.canvas.parentElement
    if (!canvasParent) {
      return
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvasOffsetX = this.canvas.getBoundingClientRect().left
    this.canvasOffsetY = this.canvas.getBoundingClientRect().top
    this.canvas.width = canvasParent.clientWidth
    this.canvas.height = canvasParent.clientHeight

    this.redoHistoryDebounced()
    if (!coordinates) return
    this.coordinates = coordinates

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

export default Whiteboard
