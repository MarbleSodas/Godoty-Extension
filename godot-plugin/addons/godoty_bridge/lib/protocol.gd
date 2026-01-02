@tool
extends RefCounted
class_name GodotyProtocol

## JSON-RPC 2.0 protocol handler for Godoty

var _handlers: Dictionary = {}  # method_name -> Callable


func register_handler(method: String, handler: Callable) -> void:
	_handlers[method] = handler


func handle_message(message: String) -> String:
	var json := JSON.new()
	var error := json.parse(message)
	
	if error != OK:
		return _create_error_response(null, -32700, "Parse error", json.get_error_message())
	
	var request: Dictionary = json.data
	
	# Validate JSON-RPC structure
	if not request.has("jsonrpc") or request.jsonrpc != "2.0":
		return _create_error_response(request.get("id"), -32600, "Invalid Request", "Missing or invalid jsonrpc version")
	
	if not request.has("method"):
		return _create_error_response(request.get("id"), -32600, "Invalid Request", "Missing method")
	
	var method: String = request.method
	var params: Dictionary = request.get("params", {})
	var request_id = request.get("id")  # Can be null for notifications
	
	# Check if handler exists
	if not _handlers.has(method):
		if request_id != null:
			return _create_error_response(request_id, -32601, "Method not found", "Unknown method: %s" % method)
		return ""  # Notifications don't get responses
	
	# Call handler
	var handler: Callable = _handlers[method]
	var result: Variant
	
	# Call handler and catch errors
	result = handler.call(params)
	
	if result is Dictionary and result.has("error"):
		if request_id != null:
			return _create_error_response(
				request_id,
				result.error.get("code", -32000),
				result.error.get("message", "Unknown error"),
				result.error.get("data")
			)
		return ""
	
	# Success response
	if request_id != null:
		return _create_success_response(request_id, result)
	
	return ""  # Notifications don't get responses


func create_notification(method: String, params: Dictionary) -> String:
	return JSON.stringify({
		"jsonrpc": "2.0",
		"method": method,
		"params": params
	})


func _create_success_response(id: Variant, result: Variant) -> String:
	return JSON.stringify({
		"jsonrpc": "2.0",
		"id": id,
		"result": result
	})


func _create_error_response(id: Variant, code: int, message: String, data: Variant = null) -> String:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	
	return JSON.stringify({
		"jsonrpc": "2.0",
		"id": id,
		"error": error
	})
