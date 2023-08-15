const getCoordinates = (
  viewWidth,
  viewHeight,
  clientWidth,
  clientHeight,
  objectFit
) => {
  const viewRatio = viewWidth / viewHeight
  const clientRatio = clientWidth / clientHeight
  let dw,
    dh = 1
  let x,
    y,
    width,
    height = 0
  if (objectFit === 'contain') {
    if (viewRatio > clientRatio) {
      dw = 1
      dh = viewHeight / clientHeight / (viewWidth / clientWidth)
    } else {
      dw = viewWidth / clientWidth / (viewHeight / clientHeight)
      dh = 1
    }
    x = clientWidth * (1 - dw) * 0.5
    y = clientHeight * (1 - dh) * 0.5
  } else if (objectFit === 'cover') {
    if (viewRatio > clientRatio) {
      dw = viewWidth / clientWidth / (viewHeight / clientHeight)
      dh = 1
    } else {
      dw = 1
      dh = viewHeight / clientHeight / (viewWidth / clientWidth)
    }

    x = (clientWidth - clientWidth * dw) * 0.5
    y = (clientHeight - clientHeight * dh) * 0.5
  } else {
    dw = viewWidth / clientWidth
    dh = viewHeight / clientHeight
    x = (clientWidth - clientWidth * dw) * 0.5
    y = (clientHeight - clientHeight * dh) * 0.5
  }
  width = clientWidth * dw
  height = clientHeight * dh

  return { x, y, width, height }
}

export { getCoordinates }
