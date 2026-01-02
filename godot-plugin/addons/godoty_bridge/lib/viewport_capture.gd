@tool
extends RefCounted
class_name GodotyViewportCapture

## Handles viewport screenshot capture for Godoty

var max_size: int = 2048


func handle_capture_viewport(params: Dictionary) -> Dictionary:
	var viewport_type: String = params.get("viewport_type", "3d")
	var max_width: int = mini(params.get("max_width", max_size), max_size)
	var max_height: int = mini(params.get("max_height", max_size), max_size)
	var format: String = params.get("format", "png")
	
	match viewport_type:
		"2d":
			return await _capture_2d_viewport(max_width, max_height, format)
		"3d":
			return await _capture_3d_viewport(max_width, max_height, format)
		"both":
			return await _capture_both_viewports(max_width, max_height, format)
		_:
			return _error(-32602, "Invalid viewport_type: %s" % viewport_type)


func _capture_2d_viewport(max_width: int, max_height: int, format: String) -> Dictionary:
	var viewport := _get_2d_viewport()
	if not viewport:
		return _error(-32004, "2D viewport not available")
	
	return await _capture_viewport(viewport, "2d", max_width, max_height, format)


func _capture_3d_viewport(max_width: int, max_height: int, format: String) -> Dictionary:
	var viewport := _get_3d_viewport()
	if not viewport:
		return _error(-32004, "3D viewport not available")
	
	return await _capture_viewport(viewport, "3d", max_width, max_height, format)


func _capture_both_viewports(max_width: int, max_height: int, format: String) -> Dictionary:
	var results := {}
	
	var viewport_2d := _get_2d_viewport()
	if viewport_2d:
		var result_2d := await _capture_viewport(viewport_2d, "2d", max_width, max_height, format)
		if result_2d.success:
			results["2d"] = {
				"image": result_2d.image,
				"width": result_2d.width,
				"height": result_2d.height
			}
	
	var viewport_3d := _get_3d_viewport()
	if viewport_3d:
		var result_3d := await _capture_viewport(viewport_3d, "3d", max_width, max_height, format)
		if result_3d.success:
			results["3d"] = {
				"image": result_3d.image,
				"width": result_3d.width,
				"height": result_3d.height
			}
	
	if results.is_empty():
		return _error(-32004, "No viewports available for capture")
	
	return {
		"success": true,
		"viewport_type": "both",
		"images": results,
		"timestamp": Time.get_unix_time_from_system()
	}


func _capture_viewport(viewport: SubViewport, type: String, max_width: int, max_height: int, format: String) -> Dictionary:
	# Wait for frame to be drawn
	await RenderingServer.frame_post_draw
	
	var texture := viewport.get_texture()
	if not texture:
		return _error(-32004, "Failed to get viewport texture")
	
	var image := texture.get_image()
	if not image:
		return _error(-32004, "Failed to get image from texture")
	
	# Resize if needed
	if image.get_width() > max_width or image.get_height() > max_height:
		var scale := minf(
			float(max_width) / image.get_width(),
			float(max_height) / image.get_height()
		)
		image.resize(
			int(image.get_width() * scale),
			int(image.get_height() * scale),
			Image.INTERPOLATE_LANCZOS
		)
	
	# Convert to base64
	var buffer: PackedByteArray
	var mime_type: String
	
	if format == "jpg" or format == "jpeg":
		buffer = image.save_jpg_to_buffer(0.9)
		mime_type = "image/jpeg"
	else:
		buffer = image.save_png_to_buffer()
		mime_type = "image/png"
	
	var base64_image := Marshalls.raw_to_base64(buffer)
	
	return {
		"success": true,
		"viewport_type": type,
		"image": "data:%s;base64,%s" % [mime_type, base64_image],
		"width": image.get_width(),
		"height": image.get_height(),
		"timestamp": Time.get_unix_time_from_system()
	}


func _get_2d_viewport() -> SubViewport:
	# Try to get 2D editor viewport
	# This is editor-specific and may need adjustment based on Godot version
	var main_screen := EditorInterface.get_editor_main_screen()
	for child in main_screen.get_children():
		if child is SubViewportContainer:
			return child.get_child(0) as SubViewport
	return null


func _get_3d_viewport() -> SubViewport:
	# Try to get 3D editor viewport
	var main_screen := EditorInterface.get_editor_main_screen()
	for child in main_screen.get_children():
		if child.name.contains("3D") or child.name.contains("Spatial"):
			for subchild in child.get_children():
				if subchild is SubViewportContainer:
					return subchild.get_child(0) as SubViewport
	return null


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
