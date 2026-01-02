@tool
extends EditorPlugin
class_name GodotyBridge

## Godoty Bridge - Main EditorPlugin
## Provides WebSocket server for communication with VS Code extension

const VERSION := "1.0.0"
const DEFAULT_PORT := 6550

# Components
var _websocket_server: GodotyWebSocketServer
var _protocol: GodotyProtocol
var _viewport_capture: GodotyViewportCapture
var _doc_extractor: GodotyDocExtractor
var _scene_inspector: GodotySceneInspector
var _action_executor: GodotyActionExecutor
var _debug_capture: GodotyDebugCapture
var _event_emitter: GodotyEventEmitter
var _status_panel: Control

# Settings
var _settings := {
	"port": DEFAULT_PORT,
	"auto_start": true,
	"enable_actions": true,
	"enable_dangerous_actions": false,
	"max_capture_size": 2048,
	"log_level": 1  # 0=none, 1=errors, 2=all
}


func _enter_tree() -> void:
	_log("Godoty Bridge v%s initializing..." % VERSION)
	
	# Initialize components
	_init_components()
	
	# Add status panel to dock
	_add_status_panel()
	
	# Start WebSocket server if auto_start enabled
	if _settings.auto_start:
		_start_server()
	
	# Connect to editor signals
	_connect_editor_signals()
	
	_log("Godoty Bridge initialized")


func _exit_tree() -> void:
	_log("Godoty Bridge shutting down...")
	
	# Stop server
	_stop_server()
	
	# Remove status panel
	if _status_panel:
		remove_control_from_docks(_status_panel)
		_status_panel.queue_free()
	
	# Clean up components
	_cleanup_components()
	
	_log("Godoty Bridge shut down")


func _init_components() -> void:
	# Create protocol handler
	_protocol = GodotyProtocol.new()
	
	# Create feature handlers
	_viewport_capture = GodotyViewportCapture.new()
	_doc_extractor = GodotyDocExtractor.new()
	_scene_inspector = GodotySceneInspector.new()
	_action_executor = GodotyActionExecutor.new()
	_debug_capture = GodotyDebugCapture.new()
	_event_emitter = GodotyEventEmitter.new()
	
	# Configure action executor
	_action_executor.enable_dangerous_actions = _settings.enable_dangerous_actions
	
	# Configure viewport capture
	_viewport_capture.max_size = _settings.max_capture_size
	
	# Register handlers with protocol
	_protocol.register_handler("capture_viewport", _viewport_capture.handle_capture_viewport)
	_protocol.register_handler("capture_game", _debug_capture.handle_capture_game)
	_protocol.register_handler("get_class_docs", _doc_extractor.handle_get_class_docs)
	_protocol.register_handler("get_method_docs", _doc_extractor.handle_get_method_docs)
	_protocol.register_handler("search_docs", _doc_extractor.handle_search_docs)
	_protocol.register_handler("get_scene_tree", _scene_inspector.handle_get_scene_tree)
	_protocol.register_handler("get_node_properties", _scene_inspector.handle_get_node_properties)
	_protocol.register_handler("get_selected_nodes", _scene_inspector.handle_get_selected_nodes)
	_protocol.register_handler("execute_action", _action_executor.handle_execute_action)
	_protocol.register_handler("get_errors", _debug_capture.handle_get_errors)
	_protocol.register_handler("get_editor_log", _debug_capture.handle_get_editor_log)
	_protocol.register_handler("get_editor_info", _handle_get_editor_info)
	_protocol.register_handler("ping", _handle_ping)
	
	# Create WebSocket server
	_websocket_server = GodotyWebSocketServer.new()
	_websocket_server.message_received.connect(_on_message_received)
	_websocket_server.client_connected.connect(_on_client_connected)
	_websocket_server.client_disconnected.connect(_on_client_disconnected)
	
	# Register debug plugin for game capture
	add_debugger_plugin(_debug_capture)


func _cleanup_components() -> void:
	if _debug_capture:
		remove_debugger_plugin(_debug_capture)


func _add_status_panel() -> void:
	var panel_scene := load("res://addons/godoty_bridge/ui/status_panel.tscn")
	if panel_scene:
		_status_panel = panel_scene.instantiate()
		add_control_to_dock(EditorPlugin.DOCK_SLOT_RIGHT_BL, _status_panel)
		_status_panel.server_start_requested.connect(_start_server)
		_status_panel.server_stop_requested.connect(_stop_server)


func _start_server() -> void:
	if _websocket_server.is_listening():
		_log("Server already running")
		return
	
	var error := _websocket_server.start(_settings.port)
	if error != OK:
		_log_error("Failed to start WebSocket server: %s" % error_string(error))
		return
	
	_log("WebSocket server started on port %d" % _settings.port)
	_update_status_panel()


func _stop_server() -> void:
	if not _websocket_server.is_listening():
		return
	
	_websocket_server.stop()
	_log("WebSocket server stopped")
	_update_status_panel()


func _connect_editor_signals() -> void:
	# Scene change
	var editor_interface := EditorInterface
	editor_interface.get_selection().selection_changed.connect(_on_selection_changed)
	
	# Connect to scene tree changes
	get_tree().node_added.connect(_on_node_added)
	get_tree().node_removed.connect(_on_node_removed)


func _on_message_received(client_id: int, message: String) -> void:
	var response := _protocol.handle_message(message)
	if response:
		_websocket_server.send_message(client_id, response)


func _on_client_connected(client_id: int) -> void:
	_log("Client connected: %d" % client_id)
	
	# Send handshake
	var handshake := _protocol.create_notification("godoty.connected", {
		"godot_version": _get_godot_version(),
		"plugin_version": VERSION,
		"capabilities": ["capture", "docs", "scene", "actions", "debug"]
	})
	_websocket_server.send_message(client_id, handshake)
	_update_status_panel()


func _on_client_disconnected(client_id: int) -> void:
	_log("Client disconnected: %d" % client_id)
	_update_status_panel()


func _on_selection_changed() -> void:
	var selected := EditorInterface.get_selection().get_selected_nodes()
	var paths: Array[String] = []
	for node in selected:
		paths.append(str(node.get_path()))
	
	_event_emitter.emit_event("godoty.selection_changed", {
		"selected_nodes": paths,
		"timestamp": Time.get_unix_time_from_system()
	})
	_broadcast_event(_event_emitter.get_last_event())


func _on_node_added(_node: Node) -> void:
	# Could emit scene_changed event if needed
	pass


func _on_node_removed(_node: Node) -> void:
	# Could emit scene_changed event if needed
	pass


func _broadcast_event(event_json: String) -> void:
	if _websocket_server:
		_websocket_server.broadcast(event_json)


func _handle_get_editor_info(_params: Dictionary) -> Dictionary:
	return {
		"success": true,
		"godot_version": _get_godot_version(),
		"plugin_version": VERSION,
		"project": {
			"name": ProjectSettings.get_setting("application/config/name", "Untitled"),
			"path": ProjectSettings.globalize_path("res://"),
			"main_scene": ProjectSettings.get_setting("application/run/main_scene", "")
		},
		"editor_state": {
			"current_scene": _get_current_scene_path(),
			"is_game_running": EditorInterface.is_playing_scene(),
			"selected_nodes": _get_selected_node_paths()
		}
	}


func _handle_ping(_params: Dictionary) -> Dictionary:
	return {
		"pong": true,
		"timestamp": Time.get_unix_time_from_system()
	}


func _get_godot_version() -> Dictionary:
	var info := Engine.get_version_info()
	return {
		"major": info.major,
		"minor": info.minor,
		"patch": info.patch,
		"status": info.status,
		"string": "%d.%d.%d.%s" % [info.major, info.minor, info.patch, info.status]
	}


func _get_current_scene_path() -> String:
	var edited_scene := EditorInterface.get_edited_scene_root()
	if edited_scene:
		return edited_scene.scene_file_path
	return ""


func _get_selected_node_paths() -> Array[String]:
	var paths: Array[String] = []
	for node in EditorInterface.get_selection().get_selected_nodes():
		paths.append(str(node.get_path()))
	return paths


func _update_status_panel() -> void:
	if _status_panel and _status_panel.has_method("update_status"):
		_status_panel.update_status({
			"is_running": _websocket_server.is_listening() if _websocket_server else false,
			"port": _settings.port,
			"client_count": _websocket_server.get_client_count() if _websocket_server else 0
		})


func _log(message: String) -> void:
	if _settings.log_level >= 2:
		print("[Godoty] %s" % message)


func _log_error(message: String) -> void:
	if _settings.log_level >= 1:
		push_error("[Godoty] %s" % message)
