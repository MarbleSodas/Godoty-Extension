@tool
extends Control

## Status panel UI for Godoty Bridge

signal server_start_requested()
signal server_stop_requested()

@onready var status_label: Label = $VBox/StatusLabel
@onready var port_label: Label = $VBox/PortLabel
@onready var clients_label: Label = $VBox/ClientsLabel
@onready var toggle_button: Button = $VBox/ToggleButton

var _is_running: bool = false


func _ready() -> void:
	update_status({
		"is_running": false,
		"port": 6550,
		"client_count": 0
	})


func update_status(status: Dictionary) -> void:
	_is_running = status.get("is_running", false)
	var port: int = status.get("port", 6550)
	var client_count: int = status.get("client_count", 0)
	
	if status_label:
		if _is_running:
			status_label.text = "● Running"
			status_label.add_theme_color_override("font_color", Color.GREEN)
		else:
			status_label.text = "○ Stopped"
			status_label.add_theme_color_override("font_color", Color.GRAY)
	
	if port_label:
		port_label.text = "Port: %d" % port
	
	if clients_label:
		clients_label.text = "Clients: %d" % client_count
	
	if toggle_button:
		toggle_button.text = "Stop Server" if _is_running else "Start Server"


func _on_toggle_button_pressed() -> void:
	if _is_running:
		server_stop_requested.emit()
	else:
		server_start_requested.emit()
