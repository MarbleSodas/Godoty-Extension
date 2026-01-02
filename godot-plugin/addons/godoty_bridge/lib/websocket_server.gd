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
