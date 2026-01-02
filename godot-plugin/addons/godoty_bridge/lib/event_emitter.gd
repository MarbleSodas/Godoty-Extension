@tool
extends RefCounted
class_name GodotyEventEmitter

## Emits events to connected clients

var _last_event: String = ""


func emit_event(event_name: String, data: Dictionary) -> void:
	var event := {
		"jsonrpc": "2.0",
		"method": event_name,
		"params": data
	}
	_last_event = JSON.stringify(event)


func get_last_event() -> String:
	return _last_event


func create_event(event_name: String, data: Dictionary) -> String:
	var event := {
		"jsonrpc": "2.0",
		"method": event_name,
		"params": data
	}
	return JSON.stringify(event)
