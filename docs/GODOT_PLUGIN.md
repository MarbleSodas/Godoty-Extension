# Godot Bridge Plugin

> Complete implementation guide for the Godoty Bridge EditorPlugin

## Table of Contents

1. [Overview](#overview)
2. [Plugin Structure](#plugin-structure)
3. [Installation](#installation)
4. [Core Components](#core-components)
5. [Implementation Details](#implementation-details)
6. [Complete Source Code](#complete-source-code)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Godoty Bridge Plugin is a Godot EditorPlugin that runs inside the Godot Editor and provides:

- **WebSocket Server**: Listens for connections from the VS Code extension
- **Viewport Capture**: Screenshots of 2D/3D editor viewports and running game
- **Documentation Extraction**: Live documentation from ClassDB
- **Scene Inspection**: Scene tree and node property queries
- **Action Execution**: Remote control of the editor
- **Debug Integration**: Error capture and game state monitoring

### Requirements

- Godot 4.3+ (primary target)
- Godot 3.5+ (future compatibility layer)

---

## Plugin Structure

```
addons/godoty_bridge/
├── plugin.cfg                    # Plugin metadata
├── godoty_bridge.gd             # Main EditorPlugin class
├── lib/
│   ├── websocket_server.gd      # WebSocket server implementation
│   ├── protocol.gd              # JSON-RPC message handling
│   ├── viewport_capture.gd      # Screenshot capture utility
│   ├── doc_extractor.gd         # ClassDB documentation fetcher
│   ├── scene_inspector.gd       # Scene tree & property reader
│   ├── action_executor.gd       # Command execution handler
│   ├── debug_capture.gd         # Running game screenshot capture
│   └── event_emitter.gd         # Event push to clients
├── ui/
│   ├── status_panel.tscn        # Status UI scene
│   └── status_panel.gd          # Status UI script
└── debug/
    └── godoty_debug_helper.gd   # Autoload for running games
```

---

## Installation

### Manual Installation

1. Copy the `addons/godoty_bridge/` folder to your project's `addons/` directory
2. Open Project → Project Settings → Plugins
3. Find "Godoty Bridge" and click "Enable"

### Automatic Installation (via VS Code Extension)

The VS Code extension can automatically install the plugin:

1. Open a Godot project in VS Code
2. Run command: "Godoty: Install Godot Plugin"
3. Restart Godot Editor

---

## Core Components

### Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                      godoty_bridge.gd                            │
│                      (EditorPlugin)                              │
│                                                                  │
│  Manages lifecycle and coordinates all components                │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ websocket_      │ │ event_emitter   │ │ status_panel    │
│ server.gd       │ │ .gd             │ │ .gd             │
│                 │ │                 │ │                 │
│ Handles network │ │ Pushes events   │ │ Shows UI in     │
│ communication   │ │ to clients      │ │ editor dock     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │
          │ Routes requests to handlers
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        protocol.gd                               │
│                                                                  │
│  Parses JSON-RPC messages and dispatches to appropriate handler │
└─────────────────────────────────────────────────────────────────┘
          │
          │ Dispatches based on method name
          │
          ├──────────────────┬──────────────────┬──────────────────┐
          ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ viewport_       │ │ doc_extractor   │ │ scene_inspector │ │ action_executor │
│ capture.gd      │ │ .gd             │ │ .gd             │ │ .gd             │
│                 │ │                 │ │                 │ │                 │
│ • capture_      │ │ • get_class_    │ │ • get_scene_    │ │ • execute_      │
│   viewport      │ │   docs          │ │   tree          │ │   action        │
│ • capture_game  │ │ • get_method_   │ │ • get_node_     │ │                 │
│                 │ │   docs          │ │   properties    │ │ • run_scene     │
│                 │ │ • search_docs   │ │ • get_selected  │ │ • stop_scene    │
│                 │ │                 │ │   _nodes        │ │ • select_node   │
│                 │ │                 │ │                 │ │ • set_property  │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
                                                                    │
                                                                    │ For game capture
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │ debug_capture   │
                                                          │ .gd             │
                                                          │                 │
                                                          │ EditorDebugger  │
                                                          │ Plugin for game │
                                                          │ screenshots     │
                                                          └─────────────────┘
```

---

## Implementation Details

### Message Flow

```
1. WebSocket receives JSON message
   │
   ▼
2. protocol.gd parses JSON-RPC
   │
   ├─► Invalid JSON → Return parse error
   │
   ▼
3. Route to handler based on "method"
   │
   ├─► "capture_viewport" → viewport_capture.gd
   ├─► "capture_game" → debug_capture.gd
   ├─► "get_class_docs" → doc_extractor.gd
   ├─► "get_scene_tree" → scene_inspector.gd
   ├─► "execute_action" → action_executor.gd
   │
   ▼
4. Handler processes request
   │
   ├─► Error → Return JSON-RPC error response
   │
   ▼
5. Return JSON-RPC success response
```

---

## Complete Source Code

### plugin.cfg

```ini
[plugin]

name="Godoty Bridge"
description="Bridge plugin for Godoty VS Code extension - enables AI-assisted Godot development"
author="Godoty"
version="1.0.0"
script="godoty_bridge.gd"
```

### godoty_bridge.gd (Main Plugin)

```gdscript
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
```

### lib/websocket_server.gd

```gdscript
@tool
extends RefCounted
class_name GodotyWebSocketServer

## WebSocket server for Godoty Bridge

signal message_received(client_id: int, message: String)
signal client_connected(client_id: int)
signal client_disconnected(client_id: int)

var _tcp_server: TCPServer
var _clients: Dictionary = {}  # client_id -> WebSocketPeer
var _next_client_id: int = 1
var _is_listening: bool = false
var _port: int = 6550


func start(port: int = 6550) -> Error:
	_port = port
	_tcp_server = TCPServer.new()
	
	var error := _tcp_server.listen(_port, "127.0.0.1")
	if error != OK:
		return error
	
	_is_listening = true
	
	# Start processing in editor
	Engine.get_main_loop().process_frame.connect(_process)
	
	return OK


func stop() -> void:
	_is_listening = false
	
	# Disconnect from process
	if Engine.get_main_loop().process_frame.is_connected(_process):
		Engine.get_main_loop().process_frame.disconnect(_process)
	
	# Close all client connections
	for client_id in _clients:
		var ws: WebSocketPeer = _clients[client_id]
		ws.close()
	_clients.clear()
	
	# Stop TCP server
	if _tcp_server:
		_tcp_server.stop()
		_tcp_server = null


func is_listening() -> bool:
	return _is_listening


func get_client_count() -> int:
	return _clients.size()


func send_message(client_id: int, message: String) -> Error:
	if not _clients.has(client_id):
		return ERR_DOES_NOT_EXIST
	
	var ws: WebSocketPeer = _clients[client_id]
	return ws.send_text(message)


func broadcast(message: String) -> void:
	for client_id in _clients:
		send_message(client_id, message)


func _process() -> void:
	if not _is_listening:
		return
	
	# Accept new connections
	while _tcp_server.is_connection_available():
		var tcp := _tcp_server.take_connection()
		if tcp:
			_handle_new_connection(tcp)
	
	# Process existing clients
	var disconnected: Array[int] = []
	
	for client_id in _clients:
		var ws: WebSocketPeer = _clients[client_id]
		ws.poll()
		
		var state := ws.get_ready_state()
		
		match state:
			WebSocketPeer.STATE_OPEN:
				# Receive messages
				while ws.get_available_packet_count() > 0:
					var packet := ws.get_packet()
					var message := packet.get_string_from_utf8()
					message_received.emit(client_id, message)
			
			WebSocketPeer.STATE_CLOSING:
				pass  # Wait for close
			
			WebSocketPeer.STATE_CLOSED:
				disconnected.append(client_id)
	
	# Remove disconnected clients
	for client_id in disconnected:
		_clients.erase(client_id)
		client_disconnected.emit(client_id)


func _handle_new_connection(tcp: StreamPeerTCP) -> void:
	var ws := WebSocketPeer.new()
	ws.accept_stream(tcp)
	
	var client_id := _next_client_id
	_next_client_id += 1
	
	_clients[client_id] = ws
	
	# Wait for WebSocket handshake to complete
	# The handshake will be processed in _process()
	
	# For now, emit connected (will be re-emitted after handshake if needed)
	call_deferred("_emit_client_connected", client_id)


func _emit_client_connected(client_id: int) -> void:
	# Check if client is still valid and connected
	if _clients.has(client_id):
		var ws: WebSocketPeer = _clients[client_id]
		ws.poll()
		if ws.get_ready_state() == WebSocketPeer.STATE_OPEN:
			client_connected.emit(client_id)
```

### lib/protocol.gd

```gdscript
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
```

### lib/viewport_capture.gd

```gdscript
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
```

### lib/doc_extractor.gd

```gdscript
@tool
extends RefCounted
class_name GodotyDocExtractor

## Extracts documentation from ClassDB for Godoty

# Cache for performance
var _cache: Dictionary = {}
var _cache_timeout: float = 3600.0  # 1 hour


func handle_get_class_docs(params: Dictionary) -> Dictionary:
	var class_name: String = params.get("class_name", "")
	var include_inherited: bool = params.get("include_inherited", false)
	
	if class_name.is_empty():
		return _error(-32602, "Missing class_name parameter")
	
	if not ClassDB.class_exists(class_name):
		return _error(-32001, "Class not found: %s" % class_name, {
			"suggestion": _find_similar_classes(class_name)
		})
	
	# Check cache
	var cache_key := "%s_%s" % [class_name, include_inherited]
	if _cache.has(cache_key):
		var cached: Dictionary = _cache[cache_key]
		if Time.get_unix_time_from_system() - cached.timestamp < _cache_timeout:
			return cached.data
	
	# Build documentation
	var doc := _build_class_docs(class_name, include_inherited)
	
	# Cache result
	_cache[cache_key] = {
		"data": doc,
		"timestamp": Time.get_unix_time_from_system()
	}
	
	return doc


func handle_get_method_docs(params: Dictionary) -> Dictionary:
	var class_name: String = params.get("class_name", "")
	var method_name: String = params.get("method_name", "")
	
	if class_name.is_empty() or method_name.is_empty():
		return _error(-32602, "Missing class_name or method_name parameter")
	
	if not ClassDB.class_exists(class_name):
		return _error(-32001, "Class not found: %s" % class_name)
	
	var methods := ClassDB.class_get_method_list(class_name)
	for method in methods:
		if method.name == method_name:
			return {
				"success": true,
				"class_name": class_name,
				"method": _format_method(method)
			}
	
	return _error(-32000, "Method not found: %s.%s" % [class_name, method_name])


func handle_search_docs(params: Dictionary) -> Dictionary:
	var query: String = params.get("query", "").to_lower()
	var search_in: Array = params.get("search_in", ["classes", "methods", "properties", "signals"])
	var limit: int = params.get("limit", 20)
	
	if query.is_empty():
		return _error(-32602, "Missing query parameter")
	
	var results: Array[Dictionary] = []
	var all_classes := ClassDB.get_class_list()
	
	for class_name in all_classes:
		if results.size() >= limit:
			break
		
		# Search class names
		if "classes" in search_in:
			if class_name.to_lower().contains(query):
				results.append({
					"type": "class",
					"class_name": class_name,
					"name": class_name,
					"description": "",  # Would need EditorHelp for descriptions
					"relevance": _calculate_relevance(class_name.to_lower(), query)
				})
		
		# Search methods
		if "methods" in search_in:
			for method in ClassDB.class_get_method_list(class_name, true):
				if method.name.to_lower().contains(query):
					results.append({
						"type": "method",
						"class_name": class_name,
						"name": method.name,
						"description": "",
						"relevance": _calculate_relevance(method.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
		
		# Search properties
		if "properties" in search_in:
			for prop in ClassDB.class_get_property_list(class_name, true):
				if prop.name.to_lower().contains(query) and prop.usage & PROPERTY_USAGE_EDITOR:
					results.append({
						"type": "property",
						"class_name": class_name,
						"name": prop.name,
						"description": "",
						"relevance": _calculate_relevance(prop.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
		
		# Search signals
		if "signals" in search_in:
			for sig in ClassDB.class_get_signal_list(class_name, true):
				if sig.name.to_lower().contains(query):
					results.append({
						"type": "signal",
						"class_name": class_name,
						"name": sig.name,
						"description": "",
						"relevance": _calculate_relevance(sig.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
	
	# Sort by relevance
	results.sort_custom(func(a, b): return a.relevance > b.relevance)
	
	return {
		"success": true,
		"query": query,
		"results": results.slice(0, limit),
		"total_count": results.size()
	}


func _build_class_docs(class_name: String, include_inherited: bool) -> Dictionary:
	var doc := {
		"success": true,
		"class_name": class_name,
		"inherits": ClassDB.get_parent_class(class_name),
		"brief_description": "",
		"description": "",
		"methods": [],
		"properties": [],
		"signals": [],
		"enums": [],
		"constants": []
	}
	
	# Get methods
	for method in ClassDB.class_get_method_list(class_name, !include_inherited):
		if not method.name.begins_with("_") or method.name == "_init" or method.name == "_ready" or method.name == "_process" or method.name == "_physics_process":
			doc.methods.append(_format_method(method))
	
	# Get properties
	for prop in ClassDB.class_get_property_list(class_name, !include_inherited):
		if prop.usage & PROPERTY_USAGE_EDITOR and not prop.name.begins_with("_"):
			doc.properties.append(_format_property(class_name, prop))
	
	# Get signals
	for sig in ClassDB.class_get_signal_list(class_name, !include_inherited):
		doc.signals.append(_format_signal(sig))
	
	# Get integer constants (often enums)
	for constant in ClassDB.class_get_integer_constant_list(class_name, !include_inherited):
		doc.constants.append({
			"name": constant,
			"value": ClassDB.class_get_integer_constant(class_name, constant)
		})
	
	return doc


func _format_method(method: Dictionary) -> Dictionary:
	var args: Array[Dictionary] = []
	for arg in method.args:
		args.append({
			"name": arg.name,
			"type": _type_to_string(arg.type),
			"default": null
		})
	
	return {
		"name": method.name,
		"return_type": _type_to_string(method.return.type),
		"description": "",
		"arguments": args
	}


func _format_property(class_name: String, prop: Dictionary) -> Dictionary:
	var default_value = ClassDB.class_get_property_default_value(class_name, prop.name)
	
	return {
		"name": prop.name,
		"type": _type_to_string(prop.type),
		"description": "",
		"default": str(default_value) if default_value != null else null,
		"hint": prop.hint,
		"hint_string": prop.hint_string
	}


func _format_signal(sig: Dictionary) -> Dictionary:
	var args: Array[Dictionary] = []
	for arg in sig.args:
		args.append({
			"name": arg.name,
			"type": _type_to_string(arg.type)
		})
	
	return {
		"name": sig.name,
		"description": "",
		"arguments": args
	}


func _type_to_string(type: int) -> String:
	match type:
		TYPE_NIL: return "void"
		TYPE_BOOL: return "bool"
		TYPE_INT: return "int"
		TYPE_FLOAT: return "float"
		TYPE_STRING: return "String"
		TYPE_VECTOR2: return "Vector2"
		TYPE_VECTOR2I: return "Vector2i"
		TYPE_RECT2: return "Rect2"
		TYPE_RECT2I: return "Rect2i"
		TYPE_VECTOR3: return "Vector3"
		TYPE_VECTOR3I: return "Vector3i"
		TYPE_TRANSFORM2D: return "Transform2D"
		TYPE_VECTOR4: return "Vector4"
		TYPE_VECTOR4I: return "Vector4i"
		TYPE_PLANE: return "Plane"
		TYPE_QUATERNION: return "Quaternion"
		TYPE_AABB: return "AABB"
		TYPE_BASIS: return "Basis"
		TYPE_TRANSFORM3D: return "Transform3D"
		TYPE_PROJECTION: return "Projection"
		TYPE_COLOR: return "Color"
		TYPE_STRING_NAME: return "StringName"
		TYPE_NODE_PATH: return "NodePath"
		TYPE_RID: return "RID"
		TYPE_OBJECT: return "Object"
		TYPE_CALLABLE: return "Callable"
		TYPE_SIGNAL: return "Signal"
		TYPE_DICTIONARY: return "Dictionary"
		TYPE_ARRAY: return "Array"
		TYPE_PACKED_BYTE_ARRAY: return "PackedByteArray"
		TYPE_PACKED_INT32_ARRAY: return "PackedInt32Array"
		TYPE_PACKED_INT64_ARRAY: return "PackedInt64Array"
		TYPE_PACKED_FLOAT32_ARRAY: return "PackedFloat32Array"
		TYPE_PACKED_FLOAT64_ARRAY: return "PackedFloat64Array"
		TYPE_PACKED_STRING_ARRAY: return "PackedStringArray"
		TYPE_PACKED_VECTOR2_ARRAY: return "PackedVector2Array"
		TYPE_PACKED_VECTOR3_ARRAY: return "PackedVector3Array"
		TYPE_PACKED_COLOR_ARRAY: return "PackedColorArray"
		_: return "Variant"


func _find_similar_classes(name: String) -> Array[String]:
	var similar: Array[String] = []
	var name_lower := name.to_lower()
	
	for class_name in ClassDB.get_class_list():
		if class_name.to_lower().contains(name_lower) or name_lower.contains(class_name.to_lower()):
			similar.append(class_name)
			if similar.size() >= 5:
				break
	
	return similar


func _calculate_relevance(text: String, query: String) -> float:
	if text == query:
		return 1.0
	if text.begins_with(query):
		return 0.9
	if text.contains(query):
		return 0.7
	return 0.5


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
```

---

## Configuration

### Plugin Settings

The plugin can be configured through the EditorSettings or by modifying the default values in `godoty_bridge.gd`:

```gdscript
var _settings := {
    "port": 6550,                      # WebSocket server port
    "auto_start": true,                # Start server automatically
    "enable_actions": true,            # Allow action execution
    "enable_dangerous_actions": false, # Allow destructive actions
    "max_capture_size": 2048,          # Max screenshot dimension
    "log_level": 1                     # 0=none, 1=errors, 2=all
}
```

### Firewall Configuration

The WebSocket server only binds to `127.0.0.1` (localhost), so no firewall configuration should be needed. However, if you experience connection issues:

- Ensure port 6550 is not in use by another application
- Check that no security software is blocking local connections

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Plugin not appearing | Ensure plugin.cfg is valid and in correct location |
| Server won't start | Check if port 6550 is already in use |
| No connection from VS Code | Verify both editor and VS Code are using same port |
| Screenshots are black | Wait for scene to fully render before capturing |
| Missing documentation | Some methods may not have ClassDB entries |

### Debug Mode

Enable verbose logging:

```gdscript
_settings.log_level = 2  # Log all messages
```

### Checking Connection

Use the status panel in the editor dock to verify:
- Server is running
- Connected client count
- Last activity timestamp

---

## Next Steps

1. See [MCP_SERVER.md](MCP_SERVER.md) for the VS Code side integration
2. See [PROTOCOL.md](PROTOCOL.md) for complete message specifications
3. See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for build instructions
