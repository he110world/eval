var s_state = 
{
	left : false,
	leftPressed : false,
	leftReleased : false,
	mx : -1,
	my : -1,
	scroll : 0,
	active : 0,
	hot : 0,
	hotToBe : 0,
	isHot : false,
	isActive : false,
	wentActive : false,
	dragX : 0,
	dragY : 0,
	dragOrig : 0,
	widgetX : 0,
	widgetY : 0,
	widgetW : 100,
	insideCurrentScroll : false,
	areaId : 0,
	widgetId : 0,
	hover : 0
}

var IMGUI_MBUT_LEFT = 0x01;
var IMGUI_MBUT_RIGHT = 0x02;

function anyActive()
{
	return s_state.active != 0;
}

function isActive(id)
{
	return s_state.active == id;
}

function isHot(id)
{
	return s_state.hot == id;
}

function inRect(x, y, w, h, checkScroll)
{
	if(checkScroll === undefined)
		checkScroll = true;
	return (!checkScroll || s_state.insideCurrentScroll) && s_state.mx >= x && s_state.mx <= x + w && s_state.my >= y && s_state.my <= y + h;
}

function clearInput()
{
	s_state.leftPressed = false;
	s_state.leftReleased = false;
	s_state.scroll = 0;
}

function clearActive()
{
	s_state.active = 0;
	// mark all UI for this frame as processed
	clearInput();
}

function setActive(id)
{
	s_state.active = id;
	s_state.wentActive = true;
}

function setHot(id)
{
	s_state.hotToBe = id;
}

function buttonLogic(id, over)
{
	var res = false;
	// process down
	if (!anyActive())
	{
		if (over)
			setHot(id);
		if (isHot(id) && s_state.leftPressed)
			setActive(id);
	}

	// if button is active, then react on left up
	if (isActive(id))
	{
		s_state.isActive = true;
		if (over)
			setHot(id);
		if (s_state.leftReleased)
		{
			if (isHot(id))
				res = true;
			clearActive();
		}
	}

	if (isHot(id))
		s_state.isHot = true;

	return res;
}

function updateInput(mx, my, mbut, scroll)
{
	var left = (mbut & IMGUI_MBUT_LEFT) != 0;

	s_state.mx = mx;
	s_state.my = my;
	s_state.leftPressed = !s_state.left && left;
	s_state.leftReleased = s_state.left && !left;
	s_state.left = left;

	s_state.scroll = scroll;
}

function imguiBeginFrame(mx, my, mbut, scroll)
{
	updateInput(mx, my, mbut, scroll);

	s_state.hot = s_state.hotToBe;
	s_state.hotToBe = 0;

	s_state.wentActive = false;
	s_state.isActive = false;
	s_state.isHot = false;

	s_state.widgetX = 0;
	s_state.widgetY = 0;
	s_state.widgetW = 0;

	s_state.areaId = 1;
	s_state.widgetId = 1;

	s_state.hover = 0;
}

function imguiEndFrame()
{
	clearInput();
	if (g_scissorOn) {
		AddGfxCmdScissor(-1);
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var BUTTON_HEIGHT = 20;
var SLIDER_HEIGHT = 20;
var SLIDER_MARKER_WIDTH = 10;
var CHECK_SIZE = 8;
var DEFAULT_SPACING = 4;
var TEXT_HEIGHT = 8;
var SCROLL_AREA_PADDING = 6;
var INDENT_SIZE = 16;
var AREA_HEADER = 28;

var TEXT_ALIGN_LEFT = 0;
var TEXT_ALIGN_CENTER = 1;
var TEXT_ALIGN_RIGHT = 2;

var g_scrollTop = 0;
var g_scrollBottom = 0;
var g_scrollRight = 0;
var g_scrollAreaTop = 0;
var g_scrollVal = 0;
var g_focusTop = 0;
var g_focusBottom = 0;
var g_scrollId = 0;
var g_insideScrollArea = false;
var g_ctx = null;
var g_scissorOn = false;
var clip = true;
function AddGfxCmdScissor(x, y, w, h)
{
	if (x >= 0) {
		g_scissorOn = true;
		if (clip) {
			g_ctx.save();
			g_ctx.beginPath();
			g_ctx.rect(x,y,w,h);
			g_ctx.clip();
		}
	} else {	// disable scissor
		if (clip) {
			g_ctx.restore();
		}
		g_scissorOn = false;
	}
}

function AddGfxCmdRect(x, y, w, h, color)
{
	g_ctx.save();
	g_ctx.strokeStyle = g_ctx.fillStyle = color;
	g_ctx.fillRect(x, y, w, h);
	g_ctx.restore();
}

function AddGfxCmdRoundedRect(x, y, w, h, r, color)
{
	g_ctx.save();
	g_ctx.strokeStyle = g_ctx.fillStyle = color;
	g_ctx.lineJoin = 'round';
	g_ctx.lineWidth = r;
	g_ctx.strokeRect(x+r/2,y+r/2,w-r,h-r);
	g_ctx.fillRect(x+r, y+r, w-2*r, h-2*r);
	g_ctx.restore();
}

function AddGfxCmdTriangle(x, y, w, h, flags, color)
{
	g_ctx.save();
	g_ctx.strokeStyle = g_ctx.fillStyle = color;
	g_ctx.beginPath();
	if (flags == 1) {	// draw |>
		g_ctx.moveTo(x, y);
		g_ctx.lineTo(x+w, y+h/2);
		g_ctx.lineTo(x, y+h);
	}
	if (flags == 2) {	// draw \/
		g_ctx.moveTo(x, y+h);
		g_ctx.lineTo(x+w/2, y);
		g_ctx.lineTo(x+w, y+h);
	}
	g_ctx.closePath();
	g_ctx.stroke();
	g_ctx.restore();
}

function AddGfxCmdText(x, y, align, text, color)
{
	var text_width = g_ctx.measureText(text).width;
	if (align == TEXT_ALIGN_CENTER) {
		x -= text_width / 2;
	} else if (align == TEXT_ALIGN_RIGHT) {
		x -= text_width;
	}

	g_ctx.save();
	g_ctx.strokeStyle = g_ctx.fillStyle = color;
	g_ctx.fillText(text, x, y);
	g_ctx.restore();
}

function SetRGBA(r, g, b, a)
{
	return 'rgba(' + r + ',' + g + ',' + b + ',' + a/255 + ')';
}

///
function imguiHover(){
	return s_state.hover;
}

function imguiBeginScrollArea(name, x, y, w, h, scroll_info)
{
	if (g_scissorOn) {
		AddGfxCmdScissor(-1);
	}
	s_state.areaId++;
	s_state.widgetId = 0;
	g_scrollId = (s_state.areaId << 16) | s_state.widgetId;

	s_state.widgetX = x + SCROLL_AREA_PADDING;
	s_state.widgetY = y + AREA_HEADER - (scroll_info.scroll);
	s_state.widgetW = w - SCROLL_AREA_PADDING * 4;
	g_scrollBottom = y - AREA_HEADER + h;
	g_scrollTop = y + AREA_HEADER;
	g_scrollRight = x + w - SCROLL_AREA_PADDING * 3;
	g_scrollVal = scroll_info;

	g_scrollAreaTop = s_state.widgetY;

	g_focusBottom = y + AREA_HEADER;
	g_focusTop = y - AREA_HEADER + h;

	g_insideScrollArea = inRect(x, y, w, h, false);
	s_state.hover = s_state.hover || g_insideScrollArea;
	s_state.insideCurrentScroll = g_insideScrollArea;

	AddGfxCmdRoundedRect(x, y, w, h, 6, SetRGBA(0, 0, 0, 192));

	AddGfxCmdText(x + AREA_HEADER / 2, y/* + h*/ + AREA_HEADER / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, name, SetRGBA(255, 255, 255, 128));

	AddGfxCmdScissor(x + SCROLL_AREA_PADDING, y + AREA_HEADER, w - SCROLL_AREA_PADDING * 4, h - AREA_HEADER - SCROLL_AREA_PADDING);

	return g_insideScrollArea;
}

function imguiEndScrollArea()
{
	// Disable scissoring.
	if (g_scissorOn) {
		AddGfxCmdScissor(-1);
	}

	// Draw scroll bar
	var x = g_scrollRight + SCROLL_AREA_PADDING / 2;
	var y = g_scrollTop;
	var w = SCROLL_AREA_PADDING * 2;
	var h = g_scrollBottom - g_scrollTop + AREA_HEADER - SCROLL_AREA_PADDING;

	var stop = g_scrollAreaTop;
	var sbot = s_state.widgetY;
	var sh = sbot - stop; // The scrollable area height.

	var barHeight = h / sh;

	if (barHeight < 1)
	{
		var barY = (sbot - y) / sh;
		if (barY < 0) barY = 0;
		if (barY > 1) barY = 1;

		// Handle scroll bar logic.
		var hid = g_scrollId;
		var hx = x;
		var hy = g_scrollBottom - Math.floor(barY*h) + AREA_HEADER - SCROLL_AREA_PADDING;
		var hw = w;
		var hh = Math.floor(barHeight*h);

		var range = h - (hh - 1);
		var over = inRect(hx, hy, hw, hh);
		buttonLogic(hid, over);
		if (isActive(hid))
		{
			var u = (hy - y) / range;
			if (s_state.wentActive)
			{
				s_state.dragY = s_state.my;
				s_state.dragOrig = u;
			}
			if (s_state.dragY != s_state.my)
			{
				u = s_state.dragOrig + (s_state.my - s_state.dragY) / range;
				if (u < 0) u = 0;
				if (u > 1) u = 1;
				g_scrollVal.scroll = (u * (sh - h));
			}
		}

		// BG
		AddGfxCmdRoundedRect(x, y, w, h, w / 2 - 1, SetRGBA(0, 0, 0, 196));
		// Bar
		if (isActive(hid))
			AddGfxCmdRoundedRect(hx, hy, hw, hh, w / 2 - 1, SetRGBA(255, 196, 0, 196));
		else
			AddGfxCmdRoundedRect(hx, hy, hw, hh, w / 2 - 1, isHot(hid) ? SetRGBA(255, 196, 0, 96) : SetRGBA(196, 196, 196, 64));

		// Handle mouse scrolling.
		if (g_insideScrollArea) // && !anyActive())
		{
			if (s_state.scroll)
			{
				g_scrollVal.scroll -= 20 * s_state.scroll;
				if (g_scrollVal.scroll < 0) g_scrollVal.scroll = 0;
				if (g_scrollVal.scroll >(sh - h)) g_scrollVal.scroll = (sh - h);
			}
		}
	}
	s_state.insideCurrentScroll = false;
}

function imguiButton(text, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = BUTTON_HEIGHT;
	s_state.widgetY += BUTTON_HEIGHT + DEFAULT_SPACING;

	var over = enabled && inRect(x, y, w, h);
	var res = buttonLogic(id, over);

	AddGfxCmdRoundedRect(x, y, w, h, BUTTON_HEIGHT / 2 - 1, SetRGBA(128, 128, 128, isActive(id) ? 196 : 96));
	if (enabled)
		AddGfxCmdText(x + BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
	else
		AddGfxCmdText(x + BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));

	return res;
}

function imguiItem(text, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = BUTTON_HEIGHT;
	s_state.widgetY += BUTTON_HEIGHT + DEFAULT_SPACING;

	var over = enabled && inRect(x, y, w, h);
	var res = buttonLogic(id, over);

	if (isHot(id))
		AddGfxCmdRoundedRect(x, y, w, h, 2.0, SetRGBA(255, 196, 0, isActive(id) ? 196 : 96));

	if (enabled)
		AddGfxCmdText(x + BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(255, 255, 255, 200));
	else
		AddGfxCmdText(x + BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));

	return res;
}

function imguiCheck(text, checked, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = BUTTON_HEIGHT;
	s_state.widgetY += BUTTON_HEIGHT + DEFAULT_SPACING;

	var over = enabled && inRect(x, y, w, h);
	var res = buttonLogic(id, over);

	var cx = x + BUTTON_HEIGHT / 2 - CHECK_SIZE / 2;
	var cy = y + BUTTON_HEIGHT / 2 - CHECK_SIZE / 2;
	AddGfxCmdRoundedRect(cx - 3, cy - 3, CHECK_SIZE + 6, CHECK_SIZE + 6, 4, SetRGBA(128, 128, 128, isActive(id) ? 196 : 96));
	if (checked)
	{
		if (enabled)
			AddGfxCmdRoundedRect(cx, cy, CHECK_SIZE, CHECK_SIZE, CHECK_SIZE / 2 - 1, SetRGBA(255, 255, 255, isActive(id) ? 255 : 200));
		else
			AddGfxCmdRoundedRect(cx, cy, CHECK_SIZE, CHECK_SIZE, CHECK_SIZE / 2 - 1, SetRGBA(128, 128, 128, 200));
	}

	if (enabled)
		AddGfxCmdText(x + BUTTON_HEIGHT, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
	else
		AddGfxCmdText(x + BUTTON_HEIGHT, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));

	return res;
}

function imguiCollapse(text, subtext, checked, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = BUTTON_HEIGHT;
	s_state.widgetY += BUTTON_HEIGHT; // + DEFAULT_SPACING;

	var cx = x + BUTTON_HEIGHT / 2 - CHECK_SIZE / 2;
	var cy = y + BUTTON_HEIGHT / 2 - CHECK_SIZE / 2;

	var over = enabled && inRect(x, y, w, h);
	var res = buttonLogic(id, over);

	if (checked)
		AddGfxCmdTriangle(cx, cy, CHECK_SIZE, CHECK_SIZE, 2, SetRGBA(255, 255, 255, isActive(id) ? 255 : 200));
	else
		AddGfxCmdTriangle(cx, cy, CHECK_SIZE, CHECK_SIZE, 1, SetRGBA(255, 255, 255, isActive(id) ? 255 : 200));

	if (enabled)
		AddGfxCmdText(x + BUTTON_HEIGHT, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
	else
		AddGfxCmdText(x + BUTTON_HEIGHT, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));

	if (subtext)
		AddGfxCmdText(x + w - BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, subtext, SetRGBA(255, 255, 255, 128));

	return res;
}

function imguiLabel(text)
{
	var x = s_state.widgetX;
	var y = s_state.widgetY;
	s_state.widgetY += BUTTON_HEIGHT;
	AddGfxCmdText(x, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(255, 255, 255, 255));
}

function imguiValue(text)
{
	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	s_state.widgetY += BUTTON_HEIGHT;

	AddGfxCmdText(x + w - BUTTON_HEIGHT / 2, y + BUTTON_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, text, SetRGBA(255, 255, 255, 200));
}

function imguiSliderFloat(text, slider, vmin, vmax, vinc, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = SLIDER_HEIGHT;
	s_state.widgetY += SLIDER_HEIGHT + DEFAULT_SPACING;

	AddGfxCmdRoundedRect(x, y, w, h, 4.0, SetRGBA(0, 0, 0, 128));

	var range = w - SLIDER_MARKER_WIDTH;

	var u = (slider.val - vmin) / (vmax - vmin);
	if (u < 0) u = 0;
	if (u > 1) u = 1;
	var m = Math.floor(u * range);

	var over = enabled && inRect(x + m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT);
	var res = buttonLogic(id, over);
	var valChanged = false;

	if (isActive(id))
	{
		if (s_state.wentActive)
		{
			s_state.dragX = s_state.mx;
			s_state.dragOrig = u;
		}
		if (s_state.dragX != s_state.mx)
		{
			u = s_state.dragOrig + (s_state.mx - s_state.dragX) / range;
			if (u < 0) u = 0;
			if (u > 1) u = 1;
			slider.val = vmin + u*(vmax - vmin);
			slider.val = Math.floor(slider.val / vinc + 0.5)*vinc; // Snap to vinc
			m = Math.floor(u * range);
			valChanged = true;
		}
	}

	if (isActive(id))
		AddGfxCmdRoundedRect(x+m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT, 4.0, SetRGBA(255, 255, 255, 255));
	else
		AddGfxCmdRoundedRect(x+m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT, 4.0, isHot(id) ? SetRGBA(255, 196, 0, 128) : SetRGBA(255, 255, 255, 64));

	if (enabled)
	{
		AddGfxCmdText(x + SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
		AddGfxCmdText(x + w - SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, slider.val, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
	}
	else
	{
		AddGfxCmdText(x + SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));
		AddGfxCmdText(x + w - SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, slider.val, SetRGBA(128, 128, 128, 200));
	}

	return res || valChanged;
}


function imguiSliderInt(text, slider, vmin, vmax, vinc, enabled)
{
	s_state.widgetId++;
	var id = (s_state.areaId << 16) | s_state.widgetId;

	var x = s_state.widgetX;
	var y = s_state.widgetY;
	var w = s_state.widgetW;
	var h = SLIDER_HEIGHT;
	s_state.widgetY += SLIDER_HEIGHT + DEFAULT_SPACING;

	AddGfxCmdRoundedRect(x, y, w, h, 4.0, SetRGBA(0, 0, 0, 128));

	var range = w - SLIDER_MARKER_WIDTH;

	var u = (slider.val - vmin) / (vmax - vmin);
	if (u < 0) u = 0;
	if (u > 1) u = 1;
	var m = Math.floor(u * range);

	var over = enabled && inRect(x + m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT);
	var res = buttonLogic(id, over);
	var valChanged = false;

	if (isActive(id))
	{
		if (s_state.wentActive)
		{
			s_state.dragX = s_state.mx;
			s_state.dragOrig = u;
		}
		if (s_state.dragX != s_state.mx)
		{
			u = s_state.dragOrig + (s_state.mx - s_state.dragX) / range;
			if (u < 0) u = 0;
			if (u > 1) u = 1;
			slider.val = Math.floor(vmin + u*(vmax - vmin));
			slider.val = Math.floor(slider.val / vinc + 0.5)*vinc; // Snap to vinc
			m = Math.floor(u * range);
			valChanged = true;
		}
	}

	if (isActive(id))
		AddGfxCmdRoundedRect(x+m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT, 4.0, SetRGBA(255, 255, 255, 255));
	else
		AddGfxCmdRoundedRect(x+m, y, SLIDER_MARKER_WIDTH, SLIDER_HEIGHT, 4.0, isHot(id) ? SetRGBA(255, 196, 0, 128) : SetRGBA(255, 255, 255, 64));

	if (enabled)
	{
		AddGfxCmdText(x + SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
		AddGfxCmdText(x + w - SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, slider.val, isHot(id) ? SetRGBA(255, 196, 0, 255) : SetRGBA(255, 255, 255, 200));
	}
	else
	{
		AddGfxCmdText(x + SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_LEFT, text, SetRGBA(128, 128, 128, 200));
		AddGfxCmdText(x + w - SLIDER_HEIGHT / 2, y + SLIDER_HEIGHT / 2 + TEXT_HEIGHT / 2, TEXT_ALIGN_RIGHT, slider.val, SetRGBA(128, 128, 128, 200));
	}

	return res || valChanged;
}


function imguiSlider(text, slider, vmin, vmax, vinc, enabled)
{
	if(Math.floor(vinc) == vinc)
	{
		imguiSliderInt(text, slider, vmin, vmax, vinc, enabled);
	}
	else
	{
		imguiSliderFloat(text, slider, vmin, vmax, vinc, enabled);
	}
}

function imguiIndent()
{
	s_state.widgetX += INDENT_SIZE;
	s_state.widgetW -= INDENT_SIZE;
}

function imguiUnindent()
{
	s_state.widgetX -= INDENT_SIZE;
	s_state.widgetW += INDENT_SIZE;
}

function imguiSeparator()
{
	s_state.widgetY += DEFAULT_SPACING * 3;
}

function imguiSeparatorLine()
{
	var x = s_state.widgetX;
	var y = s_state.widgetY + DEFAULT_SPACING * 2;
	var w = s_state.widgetW;
	var h = 1;
	s_state.widgetY += DEFAULT_SPACING * 4;

	AddGfxCmdRect(x, y, w, h, SetRGBA(255, 255, 255, 32));
}

function imguiInit(ctx)
{
	g_ctx = ctx;
}
