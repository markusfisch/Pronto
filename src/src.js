'use strict'

var M = Math,
	D = document,
	W = window,
	FA = Float32Array,
	gl,
	message,
	messageVisible,
	idMat = new FA([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1]),
	camMat = new FA(16),
	projMat = new FA(idMat),
	viewMat = new FA(idMat),
	modelViewMat = new FA(16),
	horizon = 50,
	staticLightViewMat = new FA(16),
	lightProjMat = new FA(idMat),
	lightViewMat = new FA(idMat),
	lightDirection = [0, 0, 0],
	skyColor = [.9, .9, .9, 1],
	shadowFramebuffer,
	shadowDepthTextureSize = 1024,
	shadowDepthTexture,
	shadowProgram,
	program,
	entitiesLength = 0,
	entities = [],
	width,
	height,
	ymax,
	widthToGl,
	heightToGl,
	pointersLength,
	pointersX = [],
	pointersY = [],
	keysDown = [],
	tilesLength = 8,
	tileMag = .5,
	tileSize = 2 * tileMag,
	tileSizeSq = tileSize * tileSize,
	tileHeight = tileMag * .2,
	tileColorEven = [0, .58, 1, 1],
	tileColorOdd = [0, .48, .9, 1],
	stop,
	ready,
	lost,
	jump,
	wayX,
	wayY,
	wayZ,
	wayStraights,
	wayDir,
	wayIndex,
	speed,
	shift,
	targetX,
	score,
	cursor

M.PI2 = M.PI2 || M.PI / 2
M.TAU = M.TAU || M.PI * 2

// from https://github.com/toji/gl-matrix
function invert(out, a) {
	var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
		b00 = a00 * a11 - a01 * a10,
		b01 = a00 * a12 - a02 * a10,
		b02 = a00 * a13 - a03 * a10,
		b03 = a01 * a12 - a02 * a11,
		b04 = a01 * a13 - a03 * a11,
		b05 = a02 * a13 - a03 * a12,
		b06 = a20 * a31 - a21 * a30,
		b07 = a20 * a32 - a22 * a30,
		b08 = a20 * a33 - a23 * a30,
		b09 = a21 * a32 - a22 * a31,
		b10 = a21 * a33 - a23 * a31,
		b11 = a22 * a33 - a23 * a32,
		// calculate the determinant
		d = b00 * b11 -
			b01 * b10 +
			b02 * b09 +
			b03 * b08 -
			b04 * b07 +
			b05 * b06

	if (!d) {
		return null
	}

	d = 1.0 / d

	out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d
	out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d
	out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d
	out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d
	out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d
	out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d
	out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d
	out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d
	out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d
	out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d
	out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d
	out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d
	out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d
	out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d
	out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d
	out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d
}

// from https://github.com/toji/gl-matrix
function multiply(out, a, b) {
	var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]

	// cache only the current line of the second matrix
	var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3]
	out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30
	out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31
	out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32
	out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33

	b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7]
	out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30
	out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31
	out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32
	out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33

	b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11]
	out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30
	out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31
	out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32
	out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33

	b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15]
	out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30
	out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31
	out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32
	out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33
}

// from https://github.com/toji/gl-matrix
function rotate(out, a, rad, x, y, z) {
	var len = M.sqrt(x * x + y * y + z * z),
		s, c, t,
		a00, a01, a02, a03,
		a10, a11, a12, a13,
		a20, a21, a22, a23,
		b00, b01, b02,
		b10, b11, b12,
		b20, b21, b22

	if (M.abs(len) < 0.000001) {
		return
	}

	len = 1 / len
	x *= len
	y *= len
	z *= len

	s = M.sin(rad)
	c = M.cos(rad)
	t = 1 - c

	a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3]
	a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7]
	a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11]

	// construct the elements of the rotation matrix
	b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s
	b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s
	b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c

	// perform rotation-specific matrix multiplication
	out[0] = a00 * b00 + a10 * b01 + a20 * b02
	out[1] = a01 * b00 + a11 * b01 + a21 * b02
	out[2] = a02 * b00 + a12 * b01 + a22 * b02
	out[3] = a03 * b00 + a13 * b01 + a23 * b02
	out[4] = a00 * b10 + a10 * b11 + a20 * b12
	out[5] = a01 * b10 + a11 * b11 + a21 * b12
	out[6] = a02 * b10 + a12 * b11 + a22 * b12
	out[7] = a03 * b10 + a13 * b11 + a23 * b12
	out[8] = a00 * b20 + a10 * b21 + a20 * b22
	out[9] = a01 * b20 + a11 * b21 + a21 * b22
	out[10] = a02 * b20 + a12 * b21 + a22 * b22
	out[11] = a03 * b20 + a13 * b21 + a23 * b22

	if (a !== out) {
		// if the source and destination differ, copy the unchanged last row
		out[12] = a[12]
		out[13] = a[13]
		out[14] = a[14]
		out[15] = a[15]
	}
}

// from https://github.com/toji/gl-matrix
function scale(out, a, x, y, z) {
	out[0] = a[0] * x
	out[1] = a[1] * x
	out[2] = a[2] * x
	out[3] = a[3] * x
	out[4] = a[4] * y
	out[5] = a[5] * y
	out[6] = a[6] * y
	out[7] = a[7] * y
	out[8] = a[8] * z
	out[9] = a[9] * z
	out[10] = a[10] * z
	out[11] = a[11] * z
	out[12] = a[12]
	out[13] = a[13]
	out[14] = a[14]
	out[15] = a[15]
}

// from https://github.com/toji/gl-matrix
function translate(out, a, x, y, z) {
	if (a === out) {
		out[12] = a[0] * x + a[4] * y + a[8] * z + a[12]
		out[13] = a[1] * x + a[5] * y + a[9] * z + a[13]
		out[14] = a[2] * x + a[6] * y + a[10] * z + a[14]
		out[15] = a[3] * x + a[7] * y + a[11] * z + a[15]
	} else {
		var a00, a01, a02, a03,
			a10, a11, a12, a13,
			a20, a21, a22, a23

		a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3]
		a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7]
		a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11]

		out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03
		out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13
		out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23

		out[12] = a00 * x + a10 * y + a20 * z + a[12]
		out[13] = a01 * x + a11 * y + a21 * z + a[13]
		out[14] = a02 * x + a12 * y + a22 * z + a[14]
		out[15] = a03 * x + a13 * y + a23 * z + a[15]
	}
}

// from https://github.com/toji/gl-matrix
function transpose(out, a) {
	if (out === a) {
		var a01 = a[1], a02 = a[2], a03 = a[3],
			a12 = a[6], a13 = a[7], a23 = a[11]

		out[1] = a[4]
		out[2] = a[8]
		out[3] = a[12]
		out[4] = a01
		out[6] = a[9]
		out[7] = a[13]
		out[8] = a02
		out[9] = a12
		out[11] = a[14]
		out[12] = a03
		out[13] = a13
		out[14] = a23
	} else {
		out[0] = a[0]
		out[1] = a[4]
		out[2] = a[8]
		out[3] = a[12]
		out[4] = a[1]
		out[5] = a[5]
		out[6] = a[9]
		out[7] = a[13]
		out[8] = a[2]
		out[9] = a[6]
		out[10] = a[10]
		out[11] = a[14]
		out[12] = a[3]
		out[13] = a[7]
		out[14] = a[11]
		out[15] = a[15]
	}
}

function setOrthogonal(out, l, r, b, t, near, far) {
	var lr = 1 / (l - r),
		bt = 1 / (b - t),
		nf = 1 / (near - far)
	out[0] = -2 * lr
	out[1] = 0
	out[2] = 0
	out[3] = 0
	out[4] = 0
	out[5] = -2 * bt
	out[6] = 0
	out[7] = 0
	out[8] = 0
	out[9] = 0
	out[10] = 2 * nf
	out[11] = 0
	out[12] = (l + r) * lr
	out[13] = (t + b) * bt
	out[14] = (far + near) * nf
	out[15] = 1
}

function setPerspective(out, fov, aspect, near, far) {
	var f = 1 / M.tan(fov),
		d = near - far
	out[0] = f / aspect
	out[1] = 0
	out[2] = 0
	out[3] = 0
	out[4] = 0
	out[5] = f
	out[6] = 0
	out[7] = 0
	out[8] = 0
	out[9] = 0
	out[10] = (far + near) / d
	out[11] = -1
	out[12] = 0
	out[13] = 0
	out[14] = (2 * far * near) / d
	out[15] = 0
}

function setLight(x, y, z) {
	translate(lightViewMat, staticLightViewMat, x, y, z)
	lightDirection[0] = lightViewMat[2]
	lightDirection[1] = lightViewMat[6]
	lightDirection[2] = lightViewMat[10]
}

function setCamera(x, y, z) {
	translate(viewMat, camMat, x, y, z)
	setLight(x, y, z)
}

function drawCameraModel(count, uniforms, color) {
	gl.uniform4fv(uniforms.color, color)
	gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0)
}

function drawShadowModel(count) {
	gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0)
}

function setCameraModel(uniforms, mm) {
	multiply(modelViewMat, lightViewMat, mm)
	gl.uniformMatrix4fv(uniforms.lightModelViewMat, false, modelViewMat)
	multiply(modelViewMat, viewMat, mm)
	gl.uniformMatrix4fv(uniforms.modelViewMat, false, modelViewMat)
	// the model matrix needs to be inverted and transposed to
	// scale the normals correctly
	invert(modelViewMat, mm)
	transpose(modelViewMat, modelViewMat)
	gl.uniformMatrix4fv(uniforms.normalMat, false, modelViewMat)
}

function setShadowModel(uniforms, mm) {
	multiply(modelViewMat, lightViewMat, mm)
	gl.uniformMatrix4fv(uniforms.lightModelViewMat, false, modelViewMat)
}

function bindCameraModel(attribs, model) {
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices)
	gl.vertexAttribPointer(attribs.vertex, 3, gl.FLOAT, false, 0, 0)
	gl.bindBuffer(gl.ARRAY_BUFFER, model.normals)
	gl.vertexAttribPointer(attribs.normal, 3, gl.FLOAT, false, 0, 0)
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indicies)
}

function bindShadowModel(attribs, model) {
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices)
	gl.vertexAttribPointer(attribs.vertex, 3, gl.FLOAT, false, 0, 0)
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indicies)
}

function drawEntities(bindModel, setModel, drawModel, uniforms, attribs) {
	for (var model, i = entitiesLength; i--;) {
		var e = entities[i]
		if (model != e.model) {
			model = e.model
			bindModel(attribs, model)
		}
		setModel(uniforms, e.matrix)
		drawModel(model.count, uniforms, e.color)
	}
}

function drawCameraView() {
	var uniforms = program.uniforms,
		attribs = program.attribs

	gl.useProgram(program)
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.viewport(0, 0, width, height)
	gl.clearColor(skyColor[0], skyColor[1], skyColor[2], skyColor[3])
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	gl.uniformMatrix4fv(uniforms.projMat, false, projMat)
	gl.uniformMatrix4fv(uniforms.lightProjMat, false, lightProjMat)
	gl.uniform3fv(uniforms.lightDirection, lightDirection)
	gl.uniform4fv(uniforms.sky, skyColor)
	gl.uniform1f(uniforms.far, horizon)

	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture)
	gl.uniform1i(uniforms.shadowDepthTexture, 0)

	gl.enableVertexAttribArray(attribs.vertex)
	gl.enableVertexAttribArray(attribs.normal)
	drawEntities(bindCameraModel, setCameraModel, drawCameraModel,
		uniforms, attribs)
	gl.disableVertexAttribArray(attribs.vertex)
	gl.disableVertexAttribArray(attribs.normal)
}

function drawShadowMap() {
	var attribs = shadowProgram.attribs,
		uniforms = shadowProgram.uniforms

	gl.useProgram(shadowProgram)
	gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)
	gl.viewport(0, 0, shadowDepthTextureSize, shadowDepthTextureSize)
	gl.clearColor(0, 0, 0, 1)
	gl.clearDepth(1)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	gl.uniformMatrix4fv(uniforms.lightProjMat, false, lightProjMat)

	gl.enableVertexAttribArray(attribs.vertex)
	drawEntities(bindShadowModel, setShadowModel, drawShadowModel,
		uniforms, attribs)
	gl.disableVertexAttribArray(attribs.vertex)
}

function draw() {
	drawShadowMap()
	drawCameraView()
}

function setMessage(text) {
	message.innerHTML = text
}

function gameOver() {
	if (!messageVisible) {
		messageVisible = true
		setMessage(
			'<p>You made</p>' +
			'<p class="Score">' + score + '</p>' +
			'<p>points!</p>'
		)
	}
}

function pursue() {
	if (--wayStraights > 0 || M.random() > .5) {
		wayDir = M.random()
		wayZ -= tileSize
	} else {
		wayX += wayDir > .5 ? tileSize : -tileSize
		wayStraights = 2 + M.round(M.random() * 4)
	}
	++wayIndex
}

function getTileColor() {
	return wayIndex % 2 ? tileColorEven : tileColorOdd
}

function distSq(x1, y1, z1, x2, y2, z2) {
	var dx = x1 - x2,
		dy = y1 - y2,
		dz = z1 - z2
	return dx*dx + dy*dy + dz*dz
}

function isTileNear(x, y, z) {
	for (var i = tilesLength; i--;) {
		var e = entities[i],
			em = e.origin,
			ex = em[12],
			ey = em[13],
			ez = em[14]
		if (distSq(ex, ey, ez, x, y, z) < tileSizeSq) {
			return true
		}
	}
	return false
}

function update() {
	var now = Date.now()
	for (var i = entitiesLength; i--;) {
		entities[i].update(now)
	}

	if (!ready) {
		return
	}

	var cm = cursor.origin,
		cx = cm[12],
		cy = cm[13],
		cz = cm[14]

	if (!lost && jump) {
		jump = false
		targetX = cx
		if (isTileNear(cx - tileSize, cm[13], cm[14])) {
			shift = -.3
			targetX -= tileSize
		} else {
			shift = .3
			targetX += tileSize
		}
		targetX = M.round(targetX / tileSize) * tileSize
	}
	var d = M.abs(cx - targetX)
	if (d < .1) {
		shift = d * (shift > 0 ? 4 : -4)
	}
	translate(cm, cm, shift, 0, speed)
	if (d < .1) {
		shift = 0
	}
	if (speed > -.35) {
		speed -= .001
	}

	cx = cm[12]
	cy = cm[13]
	cz = cm[14]
	setCamera(-cx, 0, -cz)

	var safe = false, off = true
	for (var i = tilesLength; i--;) {
		var e = entities[i],
			em = e.origin,
			ex = em[12],
			ey = em[13],
			ez = em[14],
			past = ez - cz
		if (!safe && distSq(ex, ey, ez, cx, cy, cz) < tileSizeSq) {
			safe = true
		}
		if (off && e.base > -100) {
			off = false
		}
		if (!lost && past > 3) {
			translate(em, idMat, wayX, wayY, wayZ)
			scale(em, em, tileMag, tileHeight, tileMag)
			e.base = 10 / M.abs(speed)
			e.drop = false
			e.color = getTileColor()
			pursue()
		} else if (past > 1) {
			e.drop = true
			e.base -= 1
		}
	}

	if (off) {
		stop = true
	}
	if (!lost && !safe) {
		lost = now
		score = M.abs(M.round(cz / (tileSize * 2)))
	}
	if (lost) {
		if (cy < -15) {
			gameOver()
		} else {
			translate(cm, cm, 0, -.5, 0)
		}
	}
}

function run() {
	!stop && requestAnimationFrame(run)
	update()
	draw()
}

function tryJump() {
	if (!lost) {
		jump = true
	} else if (stop && Date.now() - lost > 2000) {
		var isStopped = stop
		reset()
		isStopped && run()
	}
}

function setPointer(event, down) {
	var touches = event.touches
	if (!down) {
		pointersLength = touches ? touches.length : 0
	} else if (event.touches) {
		pointersLength = touches.length
		for (var i = pointersLength; i--;) {
			var t = touches[i]
			pointersX[i] = t.pageX
			pointersY[i] = t.pageY
		}
	} else {
		pointersLength = 1
		pointersX[0] = event.pageX
		pointersY[0] = event.pageY
	}

	if (down) {
		// map to WebGL coordinates
		for (var i = pointersLength; i--;) {
			pointersX[i] = pointersX[i] * widthToGl - 1
			pointersY[i] = -(pointersY[i] * heightToGl - ymax)
		}
	}

	event.preventDefault()
	event.stopPropagation()
}

function pointerCancel(event) {
	setPointer(event, false)
}

function pointerUp(event) {
	setPointer(event, false)
	tryJump()
}

function pointerMove(event) {
	setPointer(event, pointersLength)
}

function pointerDown(event) {
	setPointer(event, true)
}

function setKey(event, down) {
	keysDown[event.keyCode] = down
	event.stopPropagation()
}

function keyUp(event) {
	if (keysDown[82]) {
		W.location.reload(true)
	} else if (keysDown[83]) {
		stop ^= true
		stop || run()
	} else if (keysDown[32]) {
		tryJump()
	}
	setKey(event, false)
}

function keyDown(event) {
	setKey(event, true)
}

function resize() {
	width = gl.canvas.clientWidth
	height = gl.canvas.clientHeight

	gl.canvas.width = width
	gl.canvas.height = height

	ymax = height / width
	widthToGl = 2 / width
	heightToGl = ymax * 2 / height

	setPerspective(projMat, M.PI * .125, width / height, .1, horizon)
}

function calculateNormals(vertices, indicies) {
	var normals = []

	for (var i = 0, l = indicies.length; i < l;) {
		var a = indicies[i++] * 3,
			b = indicies[i++] * 3,
			c = indicies[i++] * 3,
			x1 = vertices[a],
			y1 = vertices[a + 1],
			z1 = vertices[a + 2],
			x2 = vertices[b],
			y2 = vertices[b + 1],
			z2 = vertices[b + 2],
			x3 = vertices[c],
			y3 = vertices[c + 1],
			z3 = vertices[c + 2],
			ux = x2 - x1,
			uy = y2 - y1,
			uz = z2 - z1,
			vx = x3 - x1,
			vy = y3 - y1,
			vz = z3 - z1,
			nx = uy * vz - uz * vy,
			ny = uz * vx - ux * vz,
			nz = ux * vy - uy * vx

		normals[a] = nx
		normals[a + 1] = ny
		normals[a + 2] = nz

		normals[b] = nx
		normals[b + 1] = ny
		normals[b + 2] = nz

		normals[c] = nx
		normals[c + 1] = ny
		normals[c + 2] = nz
	}

	return normals
}

function createModel(vertices, indicies) {
	var model = {count: indicies.length}

	model.vertices = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vertices)
	gl.bufferData(gl.ARRAY_BUFFER, new FA(vertices), gl.STATIC_DRAW)

	model.normals = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, model.normals)
	gl.bufferData(gl.ARRAY_BUFFER,
		new FA(calculateNormals(vertices, indicies)),
		gl.STATIC_DRAW)

	model.indicies = gl.createBuffer()
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indicies)
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies),
		gl.STATIC_DRAW)

	return model
}

function createCube() {
	return createModel([
		// front
		-1, -1, 1,
		1, -1, 1,
		-1, 1, 1,
		1, 1, 1,
		// right
		1, -1, 1,
		1, -1, -1,
		1, 1, 1,
		1, 1, -1,
		// back
		1, -1, -1,
		-1, -1, -1,
		1, 1, -1,
		-1, 1, -1,
		// left
		-1, -1, -1,
		-1, -1, 1,
		-1, 1, -1,
		-1, 1, 1,
		// bottom
		-1, -1, -1,
		1, -1, -1,
		-1, -1, 1,
		1, -1, 1,
		// top
		-1, 1, 1,
		1, 1, 1,
		-1, 1, -1,
		1, 1, -1
	],[
		// front
		0, 1, 3,
		0, 3, 2,
		// right
		4, 5, 7,
		4, 7, 6,
		// back
		8, 9, 11,
		8, 11, 10,
		// left
		12, 13, 15,
		12, 15, 14,
		// bottom
		16, 17, 19,
		16, 19, 18,
		// top
		20, 21, 23,
		20, 23, 22
	])
}

function createEntities() {
	entities = []

	var cubeModel = createCube()
	for (var i = tilesLength; i--;) {
		var mat = new FA(idMat)
		translate(mat, mat, wayX, wayY, wayZ)
		scale(mat, mat, tileMag, tileHeight, tileMag)
		entities.push({
			origin: new FA(mat),
			matrix: mat,
			model: cubeModel,
			color: getTileColor(),
			delta: M.sin(i),
			base: -256,
			drop: false,
			update: function(now) {
				var t = now * .002
				translate(this.matrix, this.origin, 0,
					this.base + M.sin(this.delta + t), 0)
				if (!this.drop && this.base != 0) {
					this.base *= .9
					if (M.abs(this.base) < .1) {
						this.base = 0
						if (!ready) {
							ready = true
						}
					}
				}
			}
		})
		pursue()
	}

	var mat = new FA(idMat)
	translate(mat, mat, 0, .5, 0)
	scale(mat, mat, .25, .25, .25)
	entities.push(cursor = {
		origin: mat,
		matrix: new FA(mat),
		model: cubeModel,
		color: [1, 1, 1, 1],
		roll: 8,
		update: function(now) {
			if (ready) {
				this.roll += speed / -.1
			}
			rotate(this.matrix, this.origin, this.roll * -.05, 1, .1, .1)
		}
	})

	entitiesLength = entities.length
}

function reset() {
	score = 0
	speed = -.1
	shift = 0
	targetX = 0
	stop = false
	ready = false
	jump = false
	lost = 0
	wayX = wayY = wayZ = 0
	wayStraights = 3
	wayDir = M.random()
	wayIndex = 0
	setLight(0, 0, 0)
	setCamera(0, 0, 0)
	createEntities()
	messageVisible = false
	setMessage('')
}

function cacheUniformLocations(program, uniforms) {
	if (program.uniforms === undefined) {
		program.uniforms = {}
	}
	for (var i = 0, l = uniforms.length; i < l; ++i) {
		var name = uniforms[i],
			loc = gl.getUniformLocation(program, name)
		if (!loc) {
			throw 'uniform "' + name + '" not found'
		}
		program.uniforms[name] = loc
	}
}

function cacheAttribLocations(program, attribs) {
	if (program.attribs === undefined) {
		program.attribs = {}
	}
	for (var i = 0, l = attribs.length; i < l; ++i) {
		var name = attribs[i],
			loc = gl.getAttribLocation(program, name)
		if (loc < 0) {
			throw 'attribute "' + name + '" not found'
		}
		program.attribs[name] = loc
	}
}

function cacheLocations(program, attribs, uniforms) {
	cacheAttribLocations(program, attribs)
	cacheUniformLocations(program, uniforms)
}

function compileShader(src, type) {
	var shader = gl.createShader(type)
	gl.shaderSource(shader, src)
	gl.compileShader(shader)
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw gl.getShaderInfoLog(shader)
	}
	return shader
}

function linkProgram(vs, fs) {
	var p = gl.createProgram()
	gl.attachShader(p, vs)
	gl.attachShader(p, fs)
	gl.linkProgram(p)
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		throw gl.getProgramInfoLog(p)
	}
	return p
}

function buildProgram(vertexSource, fragmentSource) {
	return linkProgram(
		compileShader(vertexSource, gl.VERTEX_SHADER),
		compileShader(fragmentSource, gl.FRAGMENT_SHADER))
}

function createPrograms() {
	shadowProgram = buildProgram(
		D.getElementById('LightVertexShader').textContent,
		D.getElementById('LightFragmentShader').textContent)
	cacheLocations(shadowProgram, ['vertex'],
		['lightProjMat', 'lightModelViewMat'])

	program = buildProgram(
		D.getElementById('VertexShader').textContent,
		D.getElementById('FragmentShader').textContent)
	cacheLocations(program, ['vertex', 'normal'], [
		'projMat', 'modelViewMat', 'normalMat',
		'lightProjMat', 'lightModelViewMat', 'lightDirection',
		'far', 'sky', 'color', 'shadowDepthTexture'])
}

function createShadowBuffer() {
	shadowFramebuffer = gl.createFramebuffer()
	gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer)

	shadowDepthTexture = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadowDepthTextureSize,
		shadowDepthTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

	var renderBuffer = gl.createRenderbuffer()
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer)
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
		shadowDepthTextureSize, shadowDepthTextureSize)

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D, shadowDepthTexture, 0)
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
		gl.RENDERBUFFER, renderBuffer)

	gl.bindTexture(gl.TEXTURE_2D, null)
	gl.bindRenderbuffer(gl.RENDERBUFFER, null)
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function createLight() {
	setOrthogonal(lightProjMat, -10, 10, -10, 10, -20, 60)
	translate(staticLightViewMat, idMat, 0, 0, -55)
	rotate(staticLightViewMat, staticLightViewMat, M.PI2 * .25, 1, .5, 0)
}

function createCamera() {
	translate(camMat, idMat, 0, 0, -10)
	rotate(camMat, camMat, .9, 1, 0, 0)
}

function init() {
	var canvas = D.getElementById('Canvas')
	gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
	message = D.getElementById('Message')

	createCamera()
	createLight()
	createShadowBuffer()
	createPrograms()
	reset()

	gl.enable(gl.DEPTH_TEST)
	gl.enable(gl.BLEND)
	gl.enable(gl.CULL_FACE)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

	W.onresize = resize
	resize()

	D.onkeydown = keyDown
	D.onkeyup = keyUp

	D.onmousedown = pointerDown
	D.onmousemove = pointerMove
	D.onmouseup = pointerUp
	D.onmouseout = pointerCancel

	if ('ontouchstart' in D) {
		D.ontouchstart = pointerDown
		D.ontouchmove = pointerMove
		D.ontouchend = pointerUp
		D.ontouchleave = pointerCancel
		D.ontouchcancel = pointerCancel
	}

	run()
}

W.onload = init

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('service-worker.js')
}
