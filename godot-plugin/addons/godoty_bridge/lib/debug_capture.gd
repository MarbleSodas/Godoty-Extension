@tool
extends EditorDebuggerPlugin
class_name GodotyDebugCapture

## Debug capture for running game screenshots and error collection

var _errors: Array[Dictionary] = []
var _max_errors: int = 100
var _pending_capture_request: Dictionary = {}
var _capture_callback: Callable


func _has_capture(captured_object_type: int) -> bool:
	# We want to capture all types for logging
	return true


func _capture(message: String, data: Array, session_id: int) -> bool:
	# Handle different debug messages
	match message:
		"debug:error":
			_handle_error(data, "error")
			return true
		"debug:warning":
			_handle_error(data, "warning")
			return true
		"debug:message":
			# Regular debug messages
			return true
		"scene:game_screenshot":
			# Response from game with screenshot
			_handle_screenshot_response(data)
			return true
	
	return false


func handle_capture_game(params: Dictionary) -> Dictionary:
	var max_width: int = params.get("max_width", 1920)
	var max_height: int = params.get("max_height", 1080)
	
	if not EditorInterface.is_playing_scene():
		return _error(-32003, "No game is currently running")
	
	# Request screenshot from running game
	# This requires the game to have the debug helper autoload
	var session := get_session(0)
	if not session:
		return _error(-32003, "No debug session available")
	
	# Send request to game
	session.send_message("godoty:capture_request", [max_width, max_height])
	
	# Wait for response (with timeout)
	var start_time := Time.get_ticks_msec()
	var timeout_ms := 5000
	
	_pending_capture_request = {
		"pending": true,
		"result": null
	}
	
	while _pending_capture_request.pending and Time.get_ticks_msec() - start_time < timeout_ms:
		await Engine.get_main_loop().process_frame
	
	if _pending_capture_request.pending:
		_pending_capture_request = {}
		return _error(-32005, "Game capture timed out")
	
	var result = _pending_capture_request.result
	_pending_capture_request = {}
	
	return result


func _handle_screenshot_response(data: Array) -> void:
	if data.size() < 1:
		_pending_capture_request.pending = false
		_pending_capture_request.result = _error(-32004, "Invalid screenshot response")
		return
	
	var image_data: String = data[0]
	var width: int = data[1] if data.size() > 1 else 0
	var height: int = data[2] if data.size() > 2 else 0
	var scene_path: String = data[3] if data.size() > 3 else ""
	
	_pending_capture_request.pending = false
	_pending_capture_request.result = {
		"success": true,
		"image": image_data,
		"width": width,
		"height": height,
		"scene_path": scene_path,
		"timestamp": Time.get_unix_time_from_system()
	}


func handle_get_errors(params: Dictionary) -> Dictionary:
	var count: int = params.get("count", 10)
	var severity: String = params.get("severity", "all")
	var since: float = params.get("since", 0.0)
	
	var filtered_errors: Array[Dictionary] = []
	
	for error in _errors:
		# Filter by severity
		if severity != "all" and error.severity != severity:
			continue
		
		# Filter by timestamp
		if since > 0 and error.timestamp < since:
			continue
		
		filtered_errors.append(error)
		
		if filtered_errors.size() >= count:
			break
	
	return {
		"success": true,
		"errors": filtered_errors,
		"total_count": _errors.size(),
		"filtered_count": filtered_errors.size()
	}


func handle_get_editor_log(params: Dictionary) -> Dictionary:
	var count: int = params.get("count", 50)
	
	# Note: Godot doesn't provide direct access to the editor output log
	# This would need to be implemented by capturing print output
	return {
		"success": true,
		"log": [],
		"message": "Editor log access not yet implemented"
	}


func _handle_error(data: Array, severity: String) -> void:
	if data.size() < 2:
		return
	
	var error_data := {
		"severity": severity,
		"message": data[0] as String,
		"source": {
			"script": data[1] as String if data.size() > 1 else "",
			"function": data[2] as String if data.size() > 2 else "",
			"line": data[3] as int if data.size() > 3 else 0
		},
		"stack_trace": data[4] as Array if data.size() > 4 else [],
		"timestamp": Time.get_unix_time_from_system()
	}
	
	_errors.push_front(error_data)
	
	# Limit stored errors
	if _errors.size() > _max_errors:
		_errors.resize(_max_errors)


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
